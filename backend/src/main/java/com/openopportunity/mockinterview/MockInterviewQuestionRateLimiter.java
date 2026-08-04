package com.openopportunity.mockinterview;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
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
 * <p>Same in-memory, per-instance, fixed-window approach as AuthRateLimitFilter/
 * PasswordResetRateLimiter (see their Javadoc for the local-first/single-instance scope caveat)
 * — keyed by candidate id rather than IP or email, since this endpoint is authenticated.
 */
@Component
public class MockInterviewQuestionRateLimiter {

    private final boolean enabled;
    private final int maxRequestsPerWindow;
    private final Duration window;
    private final ConcurrentHashMap<UUID, Window> windowsByCandidateId = new ConcurrentHashMap<>();

    public MockInterviewQuestionRateLimiter(
            @Value("${app.security.rate-limit.enabled}") boolean enabled,
            @Value("${app.security.mock-interview-question-rate-limit.max-requests}") int maxRequestsPerWindow,
            @Value("${app.security.mock-interview-question-rate-limit.window-minutes}") long windowMinutes) {
        this.enabled = enabled;
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.window = Duration.ofMinutes(windowMinutes);
    }

    private static final class Window {
        private final Instant start;
        private final AtomicInteger count;

        private Window(Instant start) {
            this.start = start;
            this.count = new AtomicInteger(1);
        }
    }

    /** True if another question-generation request is allowed for this candidate right now.
     * Counts this call toward the window regardless of the answer. */
    public boolean tryAcquire(UUID candidateId) {
        if (!enabled) {
            return true;
        }
        Instant now = Instant.now();
        Window current = windowsByCandidateId.compute(candidateId, (ignored, existing) -> {
            if (existing == null || Duration.between(existing.start, now).compareTo(window) >= 0) {
                return new Window(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return current.count.get() <= maxRequestsPerWindow;
    }
}
