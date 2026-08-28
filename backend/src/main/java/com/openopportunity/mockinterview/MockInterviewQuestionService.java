package com.openopportunity.mockinterview;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.dto.MockInterviewSessionQuestion;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionRateLimitedException;
import com.openopportunity.mockinterview.exception.QuestionGenerationUnavailableException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/** Supplies mock-interview session questions, in priority order: (1) the question bank in
 * Postgres, whenever it already has enough relevant, not-yet-asked questions to fill this session
 * outright (see BANK_THRESHOLD's own doc comment for why that's compared against the requested
 * count, not some large fixed number) — widening the experience-level match up the ladder (entry
 * -> mid -> senior -> leadership, see matchingQuestions/EXPERIENCE_LEVEL_LADDER) if the
 * candidate's own level is too thin on its own, so an entry-level candidate is never left short
 * just because the bank happens to skew toward more senior questions; (2) the Claude API
 * otherwise, persisting whatever it returns into the bank for next time. Either way, a question
 * already recorded in MockInterviewAskedQuestion for
 * this candidate is never served again (see askedQuestionRepository below), and the final list
 * returned to the candidate is grouped by skill and, within each skill, sorted easy to very
 * difficult (see groupBySkillThenDifficulty) — each question carries the skill(s) it tests, so
 * MockInterviewPage can highlight them. If the AI call also fails — or
 * app.mock-interview.ai-generation-enabled is false, which disables the call altogether — this
 * throws QuestionGenerationUnavailableException and MockInterviewController lets that surface as
 * a 502 — the frontend then falls back to its own local template generator, so a candidate can
 * always start a session regardless of which layer is down.
 *
 * <p>Deliberately not @Transactional: each repository call below (find/exists/save) is
 * independently transactional via Spring Data's default per-method behavior. That matters for
 * persistAndResolve/recordAsked — both tables have a unique index (lower(text) on the bank, see
 * V24; (candidate_id, question_id) on the asked-question table, see V67) that a duplicate insert
 * throws against; without a shared outer transaction, one failed insert doesn't abort the ones
 * after it in the same loop the way it would inside a single Postgres transaction. */
@Service
public class MockInterviewQuestionService {

    // No named constant here on purpose — the bank vs. AI decision (see getSessionQuestions)
    // compares matchingQuestions' result directly against the requested `count`: if the bank
    // already has enough relevant, not-yet-asked questions to fill this session outright, use
    // it; otherwise call the AI rather than serve a short session. A previous version compared
    // against a flat threshold (100) instead of `count` — with a few hundred questions spread
    // across a few hundred distinct skills, almost no single skill/level/industry combination
    // ever reached 100 matches, so the bank was effectively never used regardless of how much
    // content admins added. Confirmed against production data (746 total questions, still
    // essentially never enough per narrow combination to clear a fixed 100), not assumed.

    /** Ascending order — used by matchingQuestions to widen an experience-level match upward
     * (entry -> mid -> senior -> leadership) when the candidate's own level doesn't have enough
     * bank coverage on its own. Never narrows downward: a senior candidate never gets
     * entry-level-only questions padded in just because the senior-specific pool is thin. */
    private static final List<ExperienceLevel> EXPERIENCE_LEVEL_LADDER = List.of(
            ExperienceLevel.ENTRY_LEVEL, ExperienceLevel.MID_LEVEL, ExperienceLevel.SENIOR, ExperienceLevel.LEADERSHIP);

    record GeneratedQuestion(
            @JsonPropertyDescription(
                            "A single self-contained interview question sentence a real interviewer would ask out loud — no numbering, no preamble, no markdown.")
                    String text,
            @JsonPropertyDescription(
                            "Which of the candidate's listed skills (using the exact names given) this question primarily tests — 0 to 2 items. Empty for a general/behavioral question not tied to a specific skill.")
                    List<String> skills,
            @JsonPropertyDescription("How hard this question is to answer well.") QuestionDifficulty difficulty) {}

    record QuestionList(
            @JsonPropertyDescription("The generated interview questions, ordered from easiest to most difficult.")
                    List<GeneratedQuestion> questions) {}

    private final AnthropicClient client;
    private final MockInterviewQuestionRepository questionRepository;
    private final MockInterviewAskedQuestionRepository askedQuestionRepository;
    private final MockInterviewQuestionRateLimiter rateLimiter;
    private final boolean aiGenerationEnabled;

    public MockInterviewQuestionService(
            MockInterviewQuestionRepository questionRepository,
            MockInterviewAskedQuestionRepository askedQuestionRepository,
            MockInterviewQuestionRateLimiter rateLimiter,
            @Value("${app.mock-interview.ai-generation-enabled:false}") boolean aiGenerationEnabled) {
        this.questionRepository = questionRepository;
        this.askedQuestionRepository = askedQuestionRepository;
        this.rateLimiter = rateLimiter;
        this.aiGenerationEnabled = aiGenerationEnabled;
        AnthropicClient created;
        try {
            created = AnthropicOkHttpClient.fromEnv();
        } catch (RuntimeException ex) {
            created = null;
        }
        this.client = created;
    }

    public List<MockInterviewSessionQuestion> getSessionQuestions(
            UUID candidateId, List<String> skills, ExperienceLevel experienceLevel, String industry, int count) {
        if (!rateLimiter.tryAcquire(candidateId)) {
            throw new MockInterviewQuestionRateLimitedException();
        }
        Set<UUID> askedIds = askedQuestionRepository.findQuestionIdsByCandidateId(candidateId);
        List<MockInterviewQuestion> bankMatches =
                matchingQuestions(skills, experienceLevel, industry, count, askedIds);
        List<MockInterviewQuestion> selected;
        if (bankMatches.size() >= count) {
            selected = pickFromBank(bankMatches, count);
        } else {
            List<GeneratedQuestion> generated = generateWithAi(skills, experienceLevel, industry, count);
            // A "freshly generated" question can still resolve to an existing bank entity (see
            // persistAndResolve) — if that entity happens to be one this candidate was already
            // asked, drop it rather than serve it again. A shorter-than-requested session is
            // preferable to repeating a question.
            selected = persistAndResolve(generated, industry, experienceLevel).stream()
                    .filter(question -> !askedIds.contains(question.getId()))
                    .toList();
        }
        recordAsked(candidateId, selected);
        List<MockInterviewSessionQuestion> questions = selected.stream()
                .map(question -> new MockInterviewSessionQuestion(
                        question.getText(), relevantSkills(skills, question.getSkills()), question.getDifficulty()))
                .toList();
        return groupBySkillThenDifficulty(questions, skills);
    }

    /** One (candidate, question) row per selected question — best-effort like persistAndResolve's
     * own inserts: a duplicate (the candidate somehow already has this exact pairing recorded)
     * just means there's nothing new to record, not a real failure. */
    private void recordAsked(UUID candidateId, List<MockInterviewQuestion> questions) {
        for (MockInterviewQuestion question : questions) {
            try {
                askedQuestionRepository.save(new MockInterviewAskedQuestion(candidateId, question.getId()));
            } catch (DataIntegrityViolationException ex) {
                // Already recorded — nothing to do.
            }
        }
    }

    /** Groups by each question's first tagged skill, in the order the candidate listed their own
     * skills (so the session flows through one skill at a time rather than jumping around) —
     * questions tagged with a skill outside the candidate's own list keep their own trailing
     * group in first-encountered order, and untagged/general questions come last as a wrap-up.
     * Each group is internally sorted easy first, very difficult last, with a null difficulty
     * (an older bank question added before difficulty was tracked, or one an admin never set)
     * sorting to the end of its group rather than breaking the comparison. */
    private List<MockInterviewSessionQuestion> groupBySkillThenDifficulty(
            List<MockInterviewSessionQuestion> questions, List<String> candidateSkills) {
        Comparator<MockInterviewSessionQuestion> byDifficulty = Comparator.comparing(
                MockInterviewSessionQuestion::difficulty, Comparator.nullsLast(Comparator.naturalOrder()));

        Map<String, List<MockInterviewSessionQuestion>> bySkill = new LinkedHashMap<>();
        candidateSkills.forEach(skill -> bySkill.put(skill, new ArrayList<>()));
        List<MockInterviewSessionQuestion> general = new ArrayList<>();

        for (MockInterviewSessionQuestion question : questions) {
            if (question.skills().isEmpty()) {
                general.add(question);
            } else {
                bySkill.computeIfAbsent(question.skills().get(0), skill -> new ArrayList<>())
                        .add(question);
            }
        }

        List<MockInterviewSessionQuestion> result = new ArrayList<>();
        for (List<MockInterviewSessionQuestion> group : bySkill.values()) {
            List<MockInterviewSessionQuestion> sorted = new ArrayList<>(group);
            sorted.sort(byDifficulty);
            result.addAll(sorted);
        }
        general.sort(byDifficulty);
        result.addAll(general);
        return result;
    }

    /** Skill-filtered first (same for every level), then experience-level-filtered with widening:
     * starts at the candidate's own level and, only if that doesn't yield at least `count`
     * matches, keeps adding the next level up the ladder until it does (or every level has been
     * tried) — see EXPERIENCE_LEVEL_LADDER. This is what guarantees an entry-level candidate
     * always gets a full session even on a bank that's thin on entry-level-tagged questions:
     * mid/senior questions get pulled in rather than leaving the session short. */
    private List<MockInterviewQuestion> matchingQuestions(
            List<String> skills, ExperienceLevel experienceLevel, String industry, int count, Set<UUID> askedIds) {
        List<MockInterviewQuestion> matches = questionRepository.findByOptionalFilters(industry);
        List<MockInterviewQuestion> skillFiltered = matches.stream()
                .filter(question -> !askedIds.contains(question.getId()))
                // A question with no skills tagged (e.g. a soft-skills question) is a match for
                // anyone; otherwise at least one of its tagged skills has to overlap the
                // candidate's selection.
                .filter(question -> skills.isEmpty()
                        || question.getSkills().isEmpty()
                        || question.getSkills().stream().anyMatch(skills::contains))
                .toList();
        if (experienceLevel == null) {
            return skillFiltered;
        }

        int startIndex = Math.max(0, EXPERIENCE_LEVEL_LADDER.indexOf(experienceLevel));
        List<ExperienceLevel> allowedLevels = new ArrayList<>();
        List<MockInterviewQuestion> byLevel = List.of();
        for (int i = startIndex; i < EXPERIENCE_LEVEL_LADDER.size(); i++) {
            allowedLevels.add(EXPERIENCE_LEVEL_LADDER.get(i));
            byLevel = skillFiltered.stream()
                    // A question tagged with no experience levels applies to anyone; otherwise at
                    // least one of its tagged levels has to be in the allowed set built up so far.
                    .filter(question -> question.getExperienceLevels().isEmpty()
                            || question.getExperienceLevels().stream().anyMatch(allowedLevels::contains))
                    .toList();
            if (byLevel.size() >= count) {
                return byLevel;
            }
        }
        return byLevel;
    }

    private List<MockInterviewQuestion> pickFromBank(List<MockInterviewQuestion> eligible, int count) {
        List<MockInterviewQuestion> important = new ArrayList<>(
                eligible.stream().filter(MockInterviewQuestion::isImportant).toList());
        List<MockInterviewQuestion> rest = new ArrayList<>(
                eligible.stream().filter(question -> !question.isImportant()).toList());
        // Randomizes which questions get picked (within each group) — the caller groups/sorts
        // the final result afterward (see groupBySkillThenDifficulty), so this shuffle only
        // affects which questions end up in a session, not their eventual order within it.
        Collections.shuffle(important);
        Collections.shuffle(rest);

        List<MockInterviewQuestion> picked = new ArrayList<>(important.subList(0, Math.min(count, important.size())));
        for (MockInterviewQuestion question : rest) {
            if (picked.size() >= count) break;
            picked.add(question);
        }
        return picked;
    }

    /** Narrows a question's tagged skills down to just the ones the candidate actually selected
     * for this session — more useful to highlight than the question's full tag set, which may
     * include skills the candidate never chose (see matchingQuestions' "any overlap" filter).
     * Falls back to the question's own skills if either side is empty (nothing to narrow to) or
     * the overlap happens to be empty. */
    private List<String> relevantSkills(List<String> candidateSkills, List<String> questionSkills) {
        if (candidateSkills.isEmpty() || questionSkills.isEmpty()) {
            return questionSkills;
        }
        List<String> overlap = questionSkills.stream().filter(candidateSkills::contains).toList();
        return overlap.isEmpty() ? questionSkills : overlap;
    }

    /** Persists each freshly generated question into the bank (skipping any that already exist,
     * find-or-create style) and returns the resolved entity — with a real id — for every one, so
     * the caller can record/check them against the candidate's asked-question history the exact
     * same way as a bank-sourced pick. A generated question that turns out to already be banked
     * (Claude regenerated something close enough to trip the unique index on lower(text), see
     * V24) still resolves to that existing entity rather than being dropped. */
    private List<MockInterviewQuestion> persistAndResolve(
            List<GeneratedQuestion> questions, String industry, ExperienceLevel experienceLevel) {
        List<ExperienceLevel> experienceLevels = experienceLevel == null ? List.of() : List.of(experienceLevel);
        List<MockInterviewQuestion> resolved = new ArrayList<>();
        for (GeneratedQuestion question : questions) {
            Optional<MockInterviewQuestion> existing = questionRepository.findByTextIgnoreCase(question.text());
            if (existing.isPresent()) {
                resolved.add(existing.get());
                continue;
            }
            List<String> questionSkills = question.skills() == null ? List.of() : question.skills();
            try {
                resolved.add(questionRepository.save(new MockInterviewQuestion(
                        question.text(),
                        questionSkills,
                        industry,
                        experienceLevels,
                        question.difficulty(),
                        QuestionSource.AI)));
            } catch (DataIntegrityViolationException ex) {
                // Lost a race against a concurrent insert of the same text (unique index on
                // lower(text), see V24) — fetch whichever insert actually won.
                questionRepository.findByTextIgnoreCase(question.text()).ifPresent(resolved::add);
            }
        }
        return resolved;
    }

    private List<GeneratedQuestion> generateWithAi(
            List<String> skills, ExperienceLevel experienceLevel, String industry, int count) {
        if (!aiGenerationEnabled || client == null) {
            throw new QuestionGenerationUnavailableException();
        }
        try {
            StructuredMessageCreateParams<QuestionList> params = MessageCreateParams.builder()
                    .model(Model.CLAUDE_HAIKU_4_5)
                    .maxTokens(2048L)
                    .outputConfig(QuestionList.class)
                    .addUserMessage(buildPrompt(skills, experienceLevel, industry, count))
                    .build();

            QuestionList result = client.messages().create(params).content().stream()
                    .flatMap(block -> block.text().stream())
                    .findFirst()
                    .orElseThrow(QuestionGenerationUnavailableException::new)
                    .text();

            if (result.questions() == null || result.questions().isEmpty()) {
                throw new QuestionGenerationUnavailableException();
            }
            return result.questions();
        } catch (QuestionGenerationUnavailableException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new QuestionGenerationUnavailableException();
        }
    }

    private String buildPrompt(List<String> skills, ExperienceLevel experienceLevel, String industry, int count) {
        String skillsText = skills.isEmpty() ? "unspecified" : String.join(", ", skills);
        String experienceText =
                experienceLevel == null ? "unspecified" : experienceLevel.name().toLowerCase(Locale.ROOT);
        String industryText = (industry == null || industry.isBlank()) ? "unspecified" : industry;

        return """
                Generate %d unique mock interview questions for a job candidate practicing on their own.

                Candidate skills: %s
                Candidate experience level: %s
                Candidate industry: %s

                Tailor the questions to the candidate's skills, experience level, and industry where possible. \
                Each question should be a natural, self-contained sentence a real interviewer would ask out \
                loud — no numbering, no preamble, no markdown, and no two questions covering the same ground.

                Order the questions from easiest to most difficult, spread roughly evenly across EASY, NORMAL, \
                DIFFICULT, and VERY_DIFFICULT. For each question, tag which of the candidate's own skills \
                (using the exact names given above) it primarily tests, and rate its difficulty.
                """
                .formatted(count, skillsText, experienceText, industryText);
    }
}
