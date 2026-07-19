package com.openopportunity.mockinterview;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.exception.QuestionGenerationUnavailableException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/** Supplies mock-interview session questions, in priority order: (1) the question bank in
 * Postgres, once it holds enough relevant questions to skip the AI call entirely; (2) the Claude
 * API otherwise, persisting whatever it returns into the bank for next time. If the AI call also
 * fails, this throws QuestionGenerationUnavailableException and MockInterviewController lets that
 * surface as a 502 — the frontend then falls back to its own local template generator, so a
 * candidate can always start a session regardless of which layer is down.
 *
 * <p>Deliberately not @Transactional: each repository call below (find/exists/save) is
 * independently transactional via Spring Data's default per-method behavior. That matters for
 * persistGenerated — the bank has a unique index on lower(text) (see V24), so a duplicate insert
 * throws; without a shared outer transaction, one failed insert doesn't abort the ones after it
 * in the same loop the way it would inside a single Postgres transaction. */
@Service
public class MockInterviewQuestionService {

    /** Once the bank has more than this many questions matching a session's industry,
     * experience level, and (loosely) skills, serve from the bank instead of calling the AI. */
    private static final int BANK_THRESHOLD = 100;

    record QuestionList(
            @JsonPropertyDescription(
                            "The generated interview questions, each a single self-contained sentence with no numbering or preamble.")
                    List<String> questions) {}

    private final AnthropicClient client;
    private final MockInterviewQuestionRepository questionRepository;

    public MockInterviewQuestionService(MockInterviewQuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
        AnthropicClient created;
        try {
            created = AnthropicOkHttpClient.fromEnv();
        } catch (RuntimeException ex) {
            created = null;
        }
        this.client = created;
    }

    public List<String> getSessionQuestions(
            List<String> skills, ExperienceLevel experienceLevel, String industry, int count) {
        List<MockInterviewQuestion> bankMatches = matchingQuestions(skills, experienceLevel, industry);
        if (bankMatches.size() > BANK_THRESHOLD) {
            return pickFromBank(bankMatches, count);
        }

        List<String> generated = generateWithAi(skills, experienceLevel, industry, count);
        persistGenerated(generated, skills, industry, experienceLevel);
        return generated;
    }

    private List<MockInterviewQuestion> matchingQuestions(
            List<String> skills, ExperienceLevel experienceLevel, String industry) {
        List<MockInterviewQuestion> matches = questionRepository.findByOptionalFilters(industry, experienceLevel);
        if (skills.isEmpty()) {
            return matches;
        }
        // A question with no skills tagged (e.g. a soft-skills question) is a match for anyone;
        // otherwise at least one of its tagged skills has to overlap the candidate's selection.
        return matches.stream()
                .filter(question -> question.getSkills().isEmpty()
                        || question.getSkills().stream().anyMatch(skills::contains))
                .toList();
    }

    private List<String> pickFromBank(List<MockInterviewQuestion> eligible, int count) {
        List<MockInterviewQuestion> important = new ArrayList<>(
                eligible.stream().filter(MockInterviewQuestion::isImportant).toList());
        List<MockInterviewQuestion> rest = new ArrayList<>(
                eligible.stream().filter(question -> !question.isImportant()).toList());
        Collections.shuffle(important);
        Collections.shuffle(rest);

        List<MockInterviewQuestion> picked = new ArrayList<>(important.subList(0, Math.min(count, important.size())));
        for (MockInterviewQuestion question : rest) {
            if (picked.size() >= count) break;
            picked.add(question);
        }
        Collections.shuffle(picked);
        return picked.stream().map(MockInterviewQuestion::getText).toList();
    }

    private void persistGenerated(
            List<String> questions, List<String> skills, String industry, ExperienceLevel experienceLevel) {
        for (String text : questions) {
            if (questionRepository.existsByTextIgnoreCase(text)) continue;
            try {
                questionRepository.save(new MockInterviewQuestion(text, skills, industry, experienceLevel, QuestionSource.AI));
            } catch (DataIntegrityViolationException ex) {
                // Lost a race against a concurrent insert of the same text (unique index on
                // lower(text), see V24) — someone else already banked it, nothing to do here.
            }
        }
    }

    private List<String> generateWithAi(
            List<String> skills, ExperienceLevel experienceLevel, String industry, int count) {
        if (client == null) {
            throw new QuestionGenerationUnavailableException();
        }
        try {
            StructuredMessageCreateParams<QuestionList> params = MessageCreateParams.builder()
                    .model(Model.CLAUDE_OPUS_4_8)
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
                """
                .formatted(count, skillsText, experienceText, industryText);
    }
}
