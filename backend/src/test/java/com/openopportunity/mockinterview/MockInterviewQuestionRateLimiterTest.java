package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;

import com.openopportunity.ratelimit.InMemoryRateLimiter;
import com.openopportunity.ratelimit.RateLimiter;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MockInterviewQuestionRateLimiterTest {

    private static RateLimiter newRateLimiter() {
        return new InMemoryRateLimiter();
    }

    @Test
    void allowsUpToTheConfiguredMaxThenBlocksFurtherRequestsForThatCandidate() {
        MockInterviewQuestionRateLimiter limiter =
                new MockInterviewQuestionRateLimiter(true, 2, 60, newRateLimiter());
        UUID candidateId = UUID.randomUUID();

        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isFalse();
    }

    @Test
    void tracksEachCandidateIndependently() {
        MockInterviewQuestionRateLimiter limiter =
                new MockInterviewQuestionRateLimiter(true, 1, 60, newRateLimiter());

        assertThat(limiter.tryAcquire(UUID.randomUUID())).isTrue();
        assertThat(limiter.tryAcquire(UUID.randomUUID())).isTrue();
    }

    @Test
    void alwaysAllowsWhenDisabled() {
        MockInterviewQuestionRateLimiter limiter =
                new MockInterviewQuestionRateLimiter(false, 1, 60, newRateLimiter());
        UUID candidateId = UUID.randomUUID();

        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isTrue();
        assertThat(limiter.tryAcquire(candidateId)).isTrue();
    }
}
