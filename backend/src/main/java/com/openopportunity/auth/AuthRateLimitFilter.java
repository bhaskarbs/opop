package com.openopportunity.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.ratelimit.RateLimiter;
import com.openopportunity.web.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A fixed-window rate limiter (see RateLimiter — in-memory and per-instance by default, or
 * shared via Redis once app.security.rate-limit.store=redis) for the unauthenticated endpoints
 * most exposed to abuse — login/register/Google sign-in (credential stuffing, fake account
 * creation), forgot/reset password (reset-email bombing), and the community-interest form
 * (unauthenticated, sends a real email per submission — same email/SMTP-quota abuse risk as
 * forgot-password) — none of which had any throttling before this.
 *
 * <p>Keyed by client IP ({@code request.getRemoteAddr()}) — behind a reverse proxy/load balancer
 * this would need to read X-Forwarded-For instead, same "not yet a real cloud deployment" caveat
 * as elsewhere in this app (see app.security.cookie-same-site's comment for the same kind of
 * gap).
 *
 * <p>{@code app.security.rate-limit.enabled} defaults to true but is set to false via
 * {@code @TestPropertySource} on the full-stack controller tests that register/log in dozens of
 * times per run through shared helpers, all via MockMvc's single default remote address — sharing
 * one IP-keyed bucket across the whole cached Spring context would trip this on unrelated tests
 * rather than exercising anything real.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> LIMITED_PATHS = Set.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/google",
            "/api/auth/google/company",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/community/interest");

    private static final String KEY_PREFIX = "auth-rate-limit:";

    private final boolean enabled;
    private final int maxRequestsPerWindow;
    private final Duration window;
    private final ObjectMapper objectMapper;
    private final RateLimiter rateLimiter;

    public AuthRateLimitFilter(
            @Value("${app.security.rate-limit.enabled}") boolean enabled,
            @Value("${app.security.rate-limit.max-requests}") int maxRequestsPerWindow,
            @Value("${app.security.rate-limit.window-minutes}") long windowMinutes,
            ObjectMapper objectMapper,
            RateLimiter rateLimiter) {
        this.enabled = enabled;
        this.maxRequestsPerWindow = maxRequestsPerWindow;
        this.window = Duration.ofMinutes(windowMinutes);
        this.objectMapper = objectMapper;
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled || !LIMITED_PATHS.contains(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }
        boolean allowed =
                rateLimiter.tryAcquire(KEY_PREFIX + request.getRemoteAddr(), maxRequestsPerWindow, window);
        if (!allowed) {
            response.setStatus(429);
            response.setHeader("Retry-After", String.valueOf(window.getSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiError body = new ApiError(
                    Instant.now(),
                    429,
                    "Too Many Requests",
                    "Too many attempts. Please wait a few minutes and try again.",
                    List.of());
            objectMapper.writeValue(response.getWriter(), body);
            return;
        }
        filterChain.doFilter(request, response);
    }
}
