package com.openopportunity.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A CSRF backstop for the two endpoints that authenticate purely via the httpOnly refresh
 * cookie with no bearer token — /api/auth/refresh and /api/auth/logout. Every other endpoint in
 * this app requires an {@code Authorization: Bearer} header, whose token lives only in frontend
 * JS memory (never a cookie), so a cross-site attacker's page has no way to attach it and CSRF
 * doesn't apply — these two are the only exception, and Spring Security's CSRF protection is
 * disabled application-wide (see SecurityConfig), so without this they'd have none at all.
 *
 * <p>Verifies the request's Origin header (falling back to Referer, since some legitimate
 * same-origin requests omit Origin) is one of {@code app.cors.allowed-origins} before letting
 * the request reach AuthController — independent of CORS, which only stops an attacker's page
 * from reading the *response*, not from the request firing and executing server-side in the
 * first place. This matters most because this app's own SameSite cookie setting is documented to
 * need flipping from Lax to None for a real cross-origin deployment (see
 * app.security.cookie-same-site's comment) — Lax alone already blocks most practical CSRF
 * against these endpoints today, but that protection disappears entirely under None with nothing
 * else in place. Both headers missing is treated as untrusted and rejected — every real browser
 * request here (this app's own SPA, which is the only intended caller of these two endpoints)
 * always sends at least one.
 */
@Component
public class AuthOriginCheckFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of("/api/auth/refresh", "/api/auth/logout");

    private final Set<String> allowedOrigins;

    public AuthOriginCheckFilter(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
        this.allowedOrigins = Set.of(allowedOrigins);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!PROTECTED_PATHS.contains(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }
        String origin = originOf(request);
        if (origin == null || !allowedOrigins.contains(origin)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Origin not allowed");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private String originOf(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null) {
            return origin;
        }
        String referer = request.getHeader("Referer");
        if (referer == null) {
            return null;
        }
        try {
            URI uri = URI.create(referer);
            if (uri.getScheme() == null || uri.getAuthority() == null) {
                return null;
            }
            return uri.getScheme() + "://" + uri.getAuthority();
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
