package com.openopportunity.mockinterview;

import com.openopportunity.ratelimit.RateLimiter;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Caps how many question-generation requests one candidate can make — {@code POST
 * /api/candidate/mock-interviews/questions} only requires a free candidate account and has no
 * other throttling, but a request that misses MockInterviewQuestionService's DB question-bank
 * cache (varying skills/industry/experienceLevel per call is enough to always miss it) triggers
 * a real, metered call to the Claude API. Without this, an attacker could loop that miss path to
 * run up the app owner's Anthropic bill.
 *
 * <p>Delegates the actual counting to RateLimiter (in-memory and per-instance by default, or
 * shared via Redis once app.security.rate-limit.store=redis) — keyed by candidate id rather than
 * IP or email, since this endpoint is authenticated.
 */
@Component
public class MockInterviewQuestionRateLimiter {

    private static final String KEY_PREFIX = "mock-interview-question-rate-limit:";

    private final boolean enabled;
    private final int maxRequestsPerWindow;
    private final Duration window;
    private final RateLimiter rateLimiter;

    public MockInterviewQuestionRateLimiter(
            @Value("${app.security.rate-limit.enabled}") boolean enabled,
            @Value("${app.security.mock-interview-question-rate-limit.max-requests}") int maxRequestsPerWindow,
            @Value("${app.security.mock-interview-question-rate-limit.window-minutes}") long windowMinutes,
            RateLimiter rateLimiter) {
        this.enabled = enabled;
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.window = Duration.ofMinutes(windowMinutes);
        this.rateLimiter = rateLimiter;
    }

    /** True if another question-generation request is allowed for this candidate right now.
     * Counts this call toward the window regardless of the answer. */
    public boolean tryAcquire(UUID candidateId) {
        if (!enabled) {
            return true;
        }
        return rateLimiter.tryAcquire(KEY_PREFIX + candidateId, maxRequestsPerWindow, window);
    }
}
