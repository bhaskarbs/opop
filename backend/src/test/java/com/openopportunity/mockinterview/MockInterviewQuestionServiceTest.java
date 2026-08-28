package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.dto.MockInterviewSessionQuestion;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionRateLimitedException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MockInterviewQuestionServiceTest {

    private final MockInterviewQuestionRepository questionRepository = mock(MockInterviewQuestionRepository.class);
    private final MockInterviewAskedQuestionRepository askedQuestionRepository =
            mock(MockInterviewAskedQuestionRepository.class);
    private final MockInterviewQuestionRateLimiter rateLimiter = mock(MockInterviewQuestionRateLimiter.class);
    private final MockInterviewQuestionService service =
            new MockInterviewQuestionService(questionRepository, askedQuestionRepository, rateLimiter, false);

    @Test
    void refusesToServeQuestionsWhenTheCandidateIsRateLimited() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(false);

        assertThatThrownBy(() ->
                        service.getSessionQuestions(candidateId, List.of("React"), ExperienceLevel.SENIOR, "Tech", 5))
                .isInstanceOf(MockInterviewQuestionRateLimitedException.class);

        verify(questionRepository, never()).findByOptionalFilters(any());
    }

    /** The bank only needs to have as many matching, not-yet-asked questions as the session
     * actually requests (`count`) — not some large fixed number. A bank of exactly `count`
     * questions (5 here) previously would have fallen straight through to the AI (disabled in
     * this test's service instance, see the service field above) under the old flat-100
     * threshold; confirmed this was the real cause of the bank effectively never being used in
     * production, where a few hundred questions spread across a few hundred distinct skills
     * almost never reached 100 matches for any one specific combination. */
    @Test
    void servesFromTheBankWithoutCallingAiWhenItHasExactlyEnoughMatches() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            bank.add(new MockInterviewQuestion(
                    "Question " + i,
                    List.of(),
                    "Tech",
                    List.of(ExperienceLevel.SENIOR),
                    null,
                    QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters("Tech")).thenReturn(bank);

        List<MockInterviewSessionQuestion> questions =
                service.getSessionQuestions(candidateId, List.of(), ExperienceLevel.SENIOR, "Tech", 5);

        assertThat(questions).hasSize(5);
    }

    @Test
    void fallsBackToAiWhenTheBankHasFewerMatchesThanRequested() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            bank.add(new MockInterviewQuestion(
                    "Question " + i,
                    List.of(),
                    "Tech",
                    List.of(ExperienceLevel.SENIOR),
                    null,
                    QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters("Tech")).thenReturn(bank);

        // AI generation is disabled in this test's service instance (see the service field
        // above), so falling through to it surfaces as this exception rather than a real call.
        assertThatThrownBy(() ->
                        service.getSessionQuestions(candidateId, List.of(), ExperienceLevel.SENIOR, "Tech", 5))
                .isInstanceOf(com.openopportunity.mockinterview.exception.QuestionGenerationUnavailableException.class);
    }

    @Test
    void widensToMidAndSeniorQuestionsWhenEntryLevelBankCoverageIsThin() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        // Only 5 entry-level-tagged questions — on its own that's fewer than the 8 requested, so
        // without widening this would fall through to the AI (disabled in this test's service
        // instance, see the service field above) and throw QuestionGenerationUnavailableException
        // instead of returning a full session.
        for (int i = 0; i < 5; i++) {
            bank.add(new MockInterviewQuestion(
                    "Entry " + i,
                    List.of(),
                    "Tech",
                    List.of(ExperienceLevel.ENTRY_LEVEL),
                    null,
                    QuestionSource.ADMIN));
        }
        for (int i = 0; i < 96; i++) {
            bank.add(new MockInterviewQuestion(
                    "Senior " + i, List.of(), "Tech", List.of(ExperienceLevel.SENIOR), null, QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters("Tech")).thenReturn(bank);

        List<MockInterviewSessionQuestion> questions =
                service.getSessionQuestions(candidateId, List.of(), ExperienceLevel.ENTRY_LEVEL, "Tech", 8);

        assertThat(questions).hasSize(8);
    }

    @Test
    void sortsBankQuestionsEasyToVeryDifficultWithNullsLast() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        bank.add(new MockInterviewQuestion(
                "Very difficult one",
                List.of(),
                null,
                List.of(),
                QuestionDifficulty.VERY_DIFFICULT,
                QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "No difficulty set", List.of(), null, List.of(), null, QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "Easy one", List.of(), null, List.of(), QuestionDifficulty.EASY, QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "Normal one", List.of(), null, List.of(), QuestionDifficulty.NORMAL, QuestionSource.ADMIN));
        for (int i = 0; i < 100; i++) {
            bank.add(new MockInterviewQuestion(
                    "Filler " + i, List.of(), null, List.of(), QuestionDifficulty.NORMAL, QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters(null)).thenReturn(bank);

        List<MockInterviewSessionQuestion> questions =
                service.getSessionQuestions(candidateId, List.of(), null, null, 4);

        assertThat(questions)
                .extracting(MockInterviewSessionQuestion::difficulty)
                .isSortedAccordingTo(Comparator.nullsLast(Comparator.naturalOrder()));
    }

    @Test
    void narrowsAQuestionsSkillsDownToTheCandidatesSelectedOnes() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        for (int i = 0; i < 101; i++) {
            bank.add(new MockInterviewQuestion(
                    "Question " + i,
                    List.of("React", "Node.js"),
                    null,
                    List.of(),
                    null,
                    QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters(null)).thenReturn(bank);

        List<MockInterviewSessionQuestion> questions =
                service.getSessionQuestions(candidateId, List.of("React"), null, null, 5);

        assertThat(questions).allSatisfy(question -> assertThat(question.skills()).containsExactly("React"));
    }

    @Test
    void neverServesAQuestionAlreadyAskedToTheCandidate() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        MockInterviewQuestion alreadyAsked = new MockInterviewQuestion(
                "Already asked", List.of(), null, List.of(), QuestionDifficulty.EASY, QuestionSource.ADMIN);
        List<MockInterviewQuestion> bank = new ArrayList<>(List.of(alreadyAsked));
        // matchingQuestions excludes the already-asked one before the bank-vs-AI size check
        // runs, so this only needs to comfortably clear the requested count (10) once that
        // exclusion happens, not the raw bank size including it.
        for (int i = 0; i < 12; i++) {
            bank.add(new MockInterviewQuestion(
                    "Filler " + i, List.of(), null, List.of(), QuestionDifficulty.NORMAL, QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters(null)).thenReturn(bank);
        when(askedQuestionRepository.findQuestionIdsByCandidateId(candidateId))
                .thenReturn(Set.of(alreadyAsked.getId()));

        List<MockInterviewSessionQuestion> questions =
                service.getSessionQuestions(candidateId, List.of(), null, null, 10);

        assertThat(questions).extracting(MockInterviewSessionQuestion::text).doesNotContain("Already asked");
    }

    @Test
    void recordsEverySelectedQuestionAsAskedForTheCandidate() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        for (int i = 0; i < 101; i++) {
            bank.add(new MockInterviewQuestion(
                    "Question " + i, List.of(), null, List.of(), null, QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters(null)).thenReturn(bank);

        List<MockInterviewSessionQuestion> questions =
                service.getSessionQuestions(candidateId, List.of(), null, null, 5);

        verify(askedQuestionRepository, times(questions.size())).save(any());
    }

    @Test
    void groupsQuestionsBySkillInTheCandidatesOwnOrderThenByDifficultyWithinEachSkill() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        bank.add(new MockInterviewQuestion(
                "React difficult", List.of("React"), null, List.of(), QuestionDifficulty.DIFFICULT,
                QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "React easy", List.of("React"), null, List.of(), QuestionDifficulty.EASY, QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "Node difficult", List.of("Node.js"), null, List.of(), QuestionDifficulty.DIFFICULT,
                QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "Node easy", List.of("Node.js"), null, List.of(), QuestionDifficulty.EASY, QuestionSource.ADMIN));
        bank.add(new MockInterviewQuestion(
                "General", List.of(), null, List.of(), QuestionDifficulty.EASY, QuestionSource.ADMIN));
        for (int i = 0; i < 100; i++) {
            bank.add(new MockInterviewQuestion(
                    "Filler " + i, List.of(), null, List.of(), QuestionDifficulty.NORMAL, QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters(null)).thenReturn(bank);

        List<MockInterviewSessionQuestion> questions = service.getSessionQuestions(
                candidateId, List.of("Node.js", "React"), null, null, bank.size());

        List<String> texts = questions.stream().map(MockInterviewSessionQuestion::text).toList();
        assertThat(texts.indexOf("Node easy")).isLessThan(texts.indexOf("Node difficult"));
        assertThat(texts.indexOf("Node difficult")).isLessThan(texts.indexOf("React easy"));
        assertThat(texts.indexOf("React easy")).isLessThan(texts.indexOf("React difficult"));
        assertThat(texts.indexOf("React difficult")).isLessThan(texts.indexOf("General"));
    }
}
