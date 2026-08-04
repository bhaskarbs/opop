package com.openopportunity.auth;

import com.openopportunity.ratelimit.RateLimiter;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Caps how many password-reset emails a single target address can receive, independent of the
 * requester's source IP. AuthRateLimitFilter already throttles /api/auth/forgot-password by IP,
 * but that alone doesn't stop an attacker with a handful of rotating IPs/proxies from
 * email-bombing one specific victim's inbox — this closes that gap by keying on the address
 * being reset instead.
 *
 * <p>Delegates the actual counting to RateLimiter (in-memory and per-instance by default, or
 * shared via Redis once app.security.rate-limit.store=redis).
 */
@Component
public class PasswordResetRateLimiter {

    private static final String KEY_PREFIX = "password-reset-rate-limit:";

    private final boolean enabled;
    private final int maxRequestsPerWindow;
    private final Duration window;
    private final RateLimiter rateLimiter;

    public PasswordResetRateLimiter(
            @Value("${app.security.rate-limit.enabled}") boolean enabled,
            @Value("${app.security.password-reset-rate-limit.max-requests}") int maxRequestsPerWindow,
            @Value("${app.security.password-reset-rate-limit.window-minutes}") long windowMinutes,
            RateLimiter rateLimiter) {
        this.enabled = enabled;
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.window = Duration.ofMinutes(windowMinutes);
        this.rateLimiter = rateLimiter;
    }

    /** True if another reset email is allowed for this address right now. Counts this call
     * toward the window regardless of the answer, so repeatedly calling this can't be used to
     * probe whether the limit has been hit for free. */
    public boolean tryAcquire(String email) {
        if (!enabled) {
            return true;
        }
        String key = KEY_PREFIX + email.trim().toLowerCase();
        return rateLimiter.tryAcquire(key, maxRequestsPerWindow, window);
    }
}
