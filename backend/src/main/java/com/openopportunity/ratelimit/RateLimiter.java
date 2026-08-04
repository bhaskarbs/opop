package com.openopportunity.ratelimit;

import java.time.Duration;

/** Fixed-window rate limiting, abstracted from where the window counters actually live —
 * {@link InMemoryRateLimiter} (the local-first default, correct only within a single instance)
 * or {@link RedisRateLimiter} (shared across every instance, for a real multi-instance
 * deployment — see app.security.rate-limit.store). AuthRateLimitFilter,
 * PasswordResetRateLimiter, and MockInterviewQuestionRateLimiter all delegate to whichever
 * implementation is active rather than each keeping its own counters, so the store can be
 * swapped in one place without touching any of them. */
public interface RateLimiter {

    /** True if another request is allowed for this key right now. Counts this call toward the
     * window regardless of the answer, so repeatedly calling this can't be used to probe
     * whether the limit has been hit for free. Callers own their own key namespacing (e.g.
     * prefixing with which limiter they are) so unrelated limiters sharing one store can never
     * collide. */
    boolean tryAcquire(String key, int maxRequestsPerWindow, Duration window);
}
