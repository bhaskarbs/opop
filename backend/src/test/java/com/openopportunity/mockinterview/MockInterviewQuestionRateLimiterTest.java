package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class MockInterviewQuestionRateLimiterTest {

    @Test
    void allowsUpToTheConfiguredMaxThenBlocksFurtherRequestsForThatCandidate() {
        MockInterviewQuestionRateLimiter limiter = new MockInterviewQuestionRateLimiter(true, 2, 60);
        UUID candidateId = UUID.randomUUID();

        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isFalse();
    }

    @Test
    void tracksEachCandidateIndependently() {
        MockInterviewQuestionRateLimiter limiter = new MockInterviewQuestionRateLimiter(true, 1, 60);

        assertThat(limiter.tryAcquire(UUID.randomUUID())).isTrue();
        assertThat(limiter.tryAcquire(UUID.randomUUID())).isTrue();
    }

    @Test
    void alwaysAllowsWhenDisabled() {
        MockInterviewQuestionRateLimiter limiter = new MockInterviewQuestionRateLimiter(false, 1, 60);
        UUID candidateId = UUID.randomUUID();

        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isTrue();
    }
}
