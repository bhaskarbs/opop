package com.openopportunity.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class InMemoryRateLimiterTest {

    @Test
    void allowsUpToTheConfiguredMaxThenBlocksFurtherRequestsForThatKey() {
        InMemoryRateLimiter limiter = new InMemoryRateLimiter();

        assertThat(limiter.tryAcquire("key", 2, Duration.ofMinutes(5))).isTrue();
        assertThat(limiter.tryAcquire("key", 2, Duration.ofMinutes(5))).isTrue();
        assertThat(limiter.tryAcquire("key", 2, Duration.ofMinutes(5))).isFalse();
    }

    @Test
    void tracksEachKeyIndependently() {
        InMemoryRateLimiter limiter = new InMemoryRateLimiter();

        assertThat(limiter.tryAcquire("a", 1, Duration.ofMinutes(5))).isTrue();
        assertThat(limiter.tryAcquire("b", 1, Duration.ofMinutes(5))).isTrue();
        assertThat(limiter.tryAcquire("a", 1, Duration.ofMinutes(5))).isFalse();
        assertThat(limiter.tryAcquire("b", 1, Duration.ofMinutes(5))).isFalse();
    }

    @Test
    void allowsRequestsAgainOnceTheWindowHasElapsed() throws InterruptedException {
        InMemoryRateLimiter limiter = new InMemoryRateLimiter();
        Duration window = Duration.ofMillis(50);

        assertThat(limiter.tryAcquire("key", 1, window)).isTrue();
        assertThat(limiter.tryAcquire("key", 1, window)).isFalse();

        Thread.sleep(100);

        assertThat(limiter.tryAcquire("key", 1, window)).isTrue();
    }
}
