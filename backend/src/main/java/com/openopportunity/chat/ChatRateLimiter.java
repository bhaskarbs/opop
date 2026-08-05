package com.openopportunity.chat;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Caps how many chat messages one client can send — POST /api/chat is deliberately public (a
 * support widget has to work for a visitor who hasn't signed up yet), so unlike
 * MockInterviewQuestionRateLimiter this can't key on a candidate id; every request triggers a
 * real, metered Claude API call, so without this an anonymous caller could loop it to run up the
 * app owner's Anthropic bill.
 *
 * <p>Keyed by client IP (see ChatController — same caveat as AuthRateLimitFilter's Javadoc:
 * behind a real reverse proxy/load balancer this would need to read X-Forwarded-For instead).
 * Same in-memory, per-instance, fixed-window approach as the other rate limiters in this app —
 * see AuthRateLimitFilter's Javadoc for the local-first/single-instance scope caveat. */
@Component
public class ChatRateLimiter {

    private final boolean enabled;
    private final int maxRequestsPerWindow;
    private final Duration window;
    private final ConcurrentHashMap<String, Window> windowsByClientIp = new ConcurrentHashMap<>();

    public ChatRateLimiter(
            @Value("${app.security.rate-limit.enabled}") boolean enabled,
            @Value("${app.security.chat-rate-limit.max-requests}") int maxRequestsPerWindow,
            @Value("${app.security.chat-rate-limit.window-minutes}") long windowMinutes) {
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

    /** True if another chat message is allowed from this client right now. Counts this call
     * toward the window regardless of the answer. */
    public boolean tryAcquire(String clientIp) {
        if (!enabled) {
            return true;
        }
        Instant now = Instant.now();
        Window current = windowsByClientIp.compute(clientIp, (ignored, existing) -> {
            if (existing == null || Duration.between(existing.start, now).compareTo(window) >= 0) {
                return new Window(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return current.count.get() <= maxRequestsPerWindow;
    }
}
