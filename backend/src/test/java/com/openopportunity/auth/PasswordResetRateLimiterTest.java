package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PasswordResetRateLimiterTest {

    @Test
    void allowsUpToTheConfiguredMaxThenBlocksFurtherRequestsForThatAddress() {
        PasswordResetRateLimiter limiter = new PasswordResetRateLimiter(true, 2, 60);

        assertThat(limiter.tryAcquire("victim@example.com")).isTrue();
        assertThat(limiter.tryAcquire("victim@example.com")).isTrue();
        assertThat(limiter.tryAcquire("victim@example.com")).isFalse();
    }

    @Test
    void tracksEachTargetAddressIndependently() {
        PasswordResetRateLimiter limiter = new PasswordResetRateLimiter(true, 1, 60);

        assertThat(limiter.tryAcquire("victim@example.com")).isTrue();
        assertThat(limiter.tryAcquire("someoneelse@example.com")).isTrue();
        assertThat(limiter.tryAcquire("victim@example.com")).isFalse();
    }

    @Test
    void isCaseInsensitiveAndTrimsWhitespaceOnTheAddress() {
        PasswordResetRateLimiter limiter = new PasswordResetRateLimiter(true, 1, 60);

        assertThat(limiter.tryAcquire("Victim@Example.com")).isTrue();
        assertThat(limiter.tryAcquire(" victim@example.com ")).isFalse();
    }

    @Test
    void alwaysAllowsWhenDisabled() {
        PasswordResetRateLimiter limiter = new PasswordResetRateLimiter(false, 1, 60);

        assertThat(limiter.tryAcquire("victim@example.com")).isTrue();
        assertThat(limiter.tryAcquire("victim@example.com")).isTrue();
        assertThat(limiter.tryAcquire("victim@example.com")).isTrue();
    }
}
