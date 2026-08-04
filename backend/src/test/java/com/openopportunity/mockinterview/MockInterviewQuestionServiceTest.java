package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionRateLimitedException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MockInterviewQuestionServiceTest {

    private final MockInterviewQuestionRepository questionRepository = mock(MockInterviewQuestionRepository.class);
    private final MockInterviewQuestionRateLimiter rateLimiter = mock(MockInterviewQuestionRateLimiter.class);
    private final MockInterviewQuestionService service =
            new MockInterviewQuestionService(questionRepository, rateLimiter);

    @Test
    void refusesToServeQuestionsWhenTheCandidateIsRateLimited() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(false);

        assertThatThrownBy(() ->
                        service.getSessionQuestions(candidateId, List.of("React"), ExperienceLevel.SENIOR, "Tech", 5))
                .isInstanceOf(MockInterviewQuestionRateLimitedException.class);

        verify(questionRepository, never()).findByOptionalFilters(any(), any());
    }

    @Test
    void servesFromTheBankWithoutCallingAiWhenThereAreEnoughMatches() {
        UUID candidateId = UUID.randomUUID();
        when(rateLimiter.tryAcquire(candidateId)).thenReturn(true);
        List<MockInterviewQuestion> bank = new ArrayList<>();
        for (int i = 0; i < 101; i++) {
            bank.add(new MockInterviewQuestion(
                    "Question " + i, List.of(), "Tech", ExperienceLevel.SENIOR, QuestionSource.ADMIN));
        }
        when(questionRepository.findByOptionalFilters("Tech", ExperienceLevel.SENIOR)).thenReturn(bank);

        List<String> questions =
                service.getSessionQuestions(candidateId, List.of(), ExperienceLevel.SENIOR, "Tech", 5);

        assertThat(questions).hasSize(5);
    }
}
