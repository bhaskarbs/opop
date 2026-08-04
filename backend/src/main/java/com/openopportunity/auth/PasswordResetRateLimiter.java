package com.openopportunity.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Caps how many password-reset emails a single target address can receive, independent of the
 * requester's source IP. AuthRateLimitFilter already throttles /api/auth/forgot-password by IP,
 * but that alone doesn't stop an attacker with a handful of rotating IPs/proxies from
 * email-bombing one specific victim's inbox — this closes that gap by keying on the address
 * being reset instead.
 *
 * <p>Same in-memory, per-instance, fixed-window approach as AuthRateLimitFilter, for the same
 * local-first/single-instance reason (see that class's Javadoc) — a multi-instance deployment
 * would need a shared store (e.g. Redis) instead.
 */
@Component
public class PasswordResetRateLimiter {

    private final boolean enabled;
    private final int maxRequestsPerWindow;
    private final Duration window;
    private final ConcurrentHashMap<String, Window> windowsByEmail = new ConcurrentHashMap<>();

    public PasswordResetRateLimiter(
            @Value("${app.security.rate-limit.enabled}") boolean enabled,
            @Value("${app.security.password-reset-rate-limit.max-requests}") int maxRequestsPerWindow,
            @Value("${app.security.password-reset-rate-limit.window-minutes}") long windowMinutes) {
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

    /** True if another reset email is allowed for this address right now. Counts this call
     * toward the window regardless of the answer, so repeatedly calling this can't be used to
     * probe whether the limit has been hit for free. */
    public boolean tryAcquire(String email) {
        if (!enabled) {
            return true;
        }
        String key = email.trim().toLowerCase();
        Instant now = Instant.now();
        Window current = windowsByEmail.compute(key, (ignored, existing) -> {
            if (existing == null || Duration.between(existing.start, now).compareTo(window) >= 0) {
                return new Window(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return current.count.get() <= maxRequestsPerWindow;
    }
}
