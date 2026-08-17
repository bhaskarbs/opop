package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.dto.MockInterviewSessionQuestion;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionRateLimitedException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MockInterviewQuestionServiceTest {

    private final MockInterviewQuestionRepository questionRepository = mock(MockInterviewQuestionRepository.class);
    private final MockInterviewQuestionRateLimiter rateLimiter = mock(MockInterviewQuestionRateLimiter.class);
    private final MockInterviewQuestionService service =
            new MockInterviewQuestionService(questionRepository, rateLimiter, false);

    @Test
    void refusesToServeQuestionsWhenTheCandidateIsRateLimited() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(false);

        assertThatThrownBy(() ->
                        service.getSessionQuestions(candidateId, List.of("React"), ExperienceLevel.SENIOR, "Tech", 5))
                .isInstanceOf(MockInterviewQuestionRateLimitedException.class);

        verify(questionRepository, never()).findByOptionalFilters(any());
    }

    @Test
    void servesFromTheBankWithoutCallingAiWhenThereAreEnoughMatches() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        for (int i = 0; i < 101; i++) {
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
    void widensToMidAndSeniorQuestionsWhenEntryLevelBankCoverageIsThin() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        // Only 5 entry-level-tagged questions — on its own this is far below BANK_THRESHOLD
        // (100), so without widening this would fall through to the AI (disabled in this test's
        // service instance, see setUp) and throw QuestionGenerationUnavailableException instead
        // of returning a full session.
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
}
