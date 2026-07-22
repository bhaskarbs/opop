package com.openopportunity.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.settings.PlatformSettingsService;
import com.openopportunity.web.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Blocks every candidate write/action behind email verification, not just the
 * "/api/candidate/**" namespace — applying to a job, expressing interest in an idea, posting an
 * idea, recording a mock interview, editing a profile, etc. all require
 * {@link User#isEmailVerified()} to be true. Read-only requests (GET/HEAD/OPTIONS) are exempt —
 * an unverified candidate can still browse job/idea details exactly like a guest can (see
 * JobDetailPage/IdeaDetailPage, which otherwise misread a blocked GET as "not found"); it's only
 * the follow-on action that gets stopped, with a clear "verify your email" message instead of a
 * generic failure. "/api/auth/**" is exempt outright (any method) so the app can bootstrap a
 * session and let a candidate complete verification. Runs after {@link JwtAuthenticationFilter}
 * so the security context is already populated; only ever acts on a ROLE_CANDIDATE
 * authentication, so company/admin requests are untouched. The whole gate is itself behind
 * {@link PlatformSettingsService#isEmailVerificationEnabled()} — an admin can flip it off from
 * the admin console (see AdminSettingsController) and every unverified candidate is immediately
 * unblocked, with no restart and no change to their stored verification state.
 */
@Component
public class EmailVerificationFilter extends OncePerRequestFilter {

    private static final String EXEMPT_PATH_PREFIX = "/api/auth/";

    private final UserRepository userRepository;
    private final PlatformSettingsService platformSettingsService;
    private final ObjectMapper objectMapper;

    public EmailVerificationFilter(
            UserRepository userRepository,
            PlatformSettingsService platformSettingsService,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.platformSettingsService = platformSettingsService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (isUnverifiedCandidateRequest(request)) {
            writeForbidden(response);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isUnverifiedCandidateRequest(HttpServletRequest request) {
        if (isSafeMethod(request.getMethod()) || request.getRequestURI().startsWith(EXEMPT_PATH_PREFIX)) {
            return false;
        }
        if (!platformSettingsService.isEmailVerificationEnabled()) {
            return false;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UUID userId)) {
            return false;
        }
        boolean isCandidate = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_CANDIDATE"));
        if (!isCandidate) {
            return false;
        }
        return userRepository.findById(userId).map(user -> !user.isEmailVerified()).orElse(false);
    }

    private boolean isSafeMethod(String method) {
        return method.equals("GET") || method.equals("HEAD") || method.equals("OPTIONS");
    }

    private void writeForbidden(HttpServletResponse response) throws IOException {
        ApiError body = new ApiError(
                Instant.now(),
                HttpServletResponse.SC_FORBIDDEN,
                "Forbidden",
                "Please verify your email before continuing.",
                List.of());
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
