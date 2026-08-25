package com.openopportunity.config;

import com.openopportunity.auth.AuthOriginCheckFilter;
import com.openopportunity.auth.AuthRateLimitFilter;
import com.openopportunity.auth.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            AuthRateLimitFilter authRateLimitFilter,
            AuthOriginCheckFilter authOriginCheckFilter)
            throws Exception {
        http.cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                // This backend only ever serves JSON and binary files (photos, logos, resumes,
                // recordings) — the actual frontend HTML is a separate Vite-served origin — so a
                // maximally strict CSP costs nothing functionally here. It's a defense-in-depth
                // backstop for the few places this app *could* emit HTML (an error page, a
                // future endpoint) rather than something the current app actively relies on.
                // Spring Security's other default security headers (X-Content-Type-Options,
                // X-Frame-Options, HSTS once served over TLS) are unaffected — .headers(...)
                // only adds to them, it doesn't replace the defaults.
                .headers(headers -> headers.contentSecurityPolicy(
                        csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'; base-uri 'none'")))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Spring Boot forwards every response.sendError(...) call to /error
                        // internally, and the security filter chain runs a second time on that
                        // forward (JwtAuthenticationFilter opts out via OncePerRequestFilter's
                        // shouldNotFilterErrorDispatch(), but AuthorizationFilter doesn't). With
                        // no Authorization header reprocessed on that second pass, an unguarded
                        // /error would itself be denied by .anyRequest().authenticated() below —
                        // which silently overwrote the real 403 from accessDeniedHandler with a
                        // 401 from authenticationEntryPoint on every access-denied response.
                        .requestMatchers("/error")
                        .permitAll()
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/info",
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/google",
                                "/api/auth/google/company",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/community/interest",
                                // Public so the support chat widget works for a visitor who
                                // hasn't signed up yet, not just logged-in users — see
                                // ChatController/ChatRateLimiter.
                                "/api/chat",
                                // Razorpay calls this server-to-server with no JWT — auth is the
                                // HMAC signature check inside CandidateBillingService, not Spring
                                // Security. See RazorpayWebhookController.
                                "/api/webhooks/razorpay")
                        .permitAll()
                        // The whole shared-video watch experience is unauthenticated by design —
                        // an external recipient (SharedVideoController) has only the share token
                        // itself, never a login. Covers metadata/video/progress, GET and POST
                        // alike, unlike the narrower single-path GET rules below.
                        .requestMatchers("/api/shared-videos/**")
                        .permitAll()
                        // Same reasoning as shared-videos above, for a candidate's own mock
                        // interview share link (MockInterviewShareController) — the share token
                        // alone is the access control, no login involved.
                        .requestMatchers("/api/mock-interview-shares/**")
                        .permitAll()
                        // Public so a plain <img src> can load it with no bearer token — see
                        // CandidatePhotoController. Distinct from the singular "/api/candidate/**"
                        // (that candidate's own authenticated profile) below.
                        .requestMatchers(HttpMethod.GET, "/api/candidates/*/photo")
                        .permitAll()
                        // Same reasoning, for a certification logo (see
                        // CandidateCertificationLogoController) — three path segments still
                        // matches this wildcard pattern fine, since each `*` matches exactly one
                        // segment and Spring's pattern here has three `*`/literal segments after
                        // "/api/candidates/".
                        .requestMatchers(HttpMethod.GET, "/api/candidates/*/certifications/*/logo")
                        .permitAll()
                        // Same reasoning as candidate photos above, for a company's logo (see
                        // CompanyLogoController) — plural "/api/companies/**", distinct from the
                        // singular "/api/company/**" (that company's own authenticated profile)
                        // below, so there's no pattern overlap to worry about ordering-wise.
                        .requestMatchers(HttpMethod.GET, "/api/companies/*/logo")
                        .permitAll()
                        // /mine and /pending must be declared before the general GET
                        // /api/jobs/** permitAll rule below — authorizeHttpRequests matches in
                        // declaration order, and both would otherwise also match that broader
                        // single-segment pattern.
                        .requestMatchers(HttpMethod.GET, "/api/jobs/mine")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.GET, "/api/jobs/pending")
                        .hasRole("ADMIN")
                        // Admin browsing across every status (AdminJobsPage's status filter) —
                        // same declaration-order reasoning as /mine and /pending above; this
                        // single-segment literal path would otherwise also match the broader
                        // permitAll "/api/jobs/*" pattern below.
                        .requestMatchers(HttpMethod.GET, "/api/jobs/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/jobs/*/approve", "/api/jobs/*/reject")
                        .hasRole("ADMIN")
                        // Job-featuring lives on the new admin Jobs page (ADMIN/SUPER_ADMIN
                        // only, not reviewer) — same tier split as /api/admin/team's create/
                        // delete vs. list.
                        .requestMatchers(HttpMethod.POST, "/api/jobs/*/feature", "/api/jobs/*/unfeature")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Admin hard delete (AdminJobsPage) — a distinct path from the
                        // owner-scoped DELETE /api/jobs/* below, so no declaration-order
                        // conflict with it either way.
                        .requestMatchers(HttpMethod.DELETE, "/api/jobs/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Admin create/edit (AdminJobsPage) — same tier as feature/unfeature/
                        // adminDelete above. Structurally distinct patterns from the
                        // owner-scoped POST /api/jobs and PUT /api/jobs/* below (an Ant `*`
                        // matches exactly one path segment, and these have either zero or two),
                        // so — same as the DELETE pair above — there's no declaration-order
                        // conflict with them either way.
                        .requestMatchers(HttpMethod.POST, "/api/jobs/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Admin detail read (AdminJobsPage's edit form) — same tier and same
                        // no-conflict reasoning as the admin create/edit/delete rules above;
                        // "/api/jobs/*/admin" is a distinct two-segment pattern from the
                        // permitAll "/api/jobs/*" single-segment one below.
                        .requestMatchers(HttpMethod.GET, "/api/jobs/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Admin display-branding override (AdminPostJobPage's company name/logo
                        // fields) — same tier as the admin create/edit/delete rules above.
                        // Three-segment patterns, structurally distinct from every shorter one
                        // here, so no declaration-order conflict either way.
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/*/admin/branding")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Backdating an already-posted job's "posted" date (scripts/
                        // backdate_naukri_jobs.py) — same tier as the branding/logo three-segment
                        // admin rules above.
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/*/admin/posted-at")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/jobs/*/admin/logo")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/jobs/*/admin/logo")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Public — mirrors GET /api/companies/*/logo above; a job's own logo
                        // override is shown to anyone browsing jobs, not just admins.
                        .requestMatchers(HttpMethod.GET, "/api/jobs/*/logo")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/jobs", "/api/jobs/*")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/jobs")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/*")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.DELETE, "/api/jobs/*")
                        .hasRole("COMPANY")
                        // A company setting/uploading/removing a display-name or logo override
                        // on its own job — owner-scoped counterparts of the admin
                        // branding/logo rules above. Two-segment patterns, structurally
                        // distinct from the single-segment owner-scoped rules just above and
                        // the three-segment admin ones above that, so no declaration-order
                        // conflict either way.
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/*/branding")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.POST, "/api/jobs/*/logo")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.DELETE, "/api/jobs/*/logo")
                        .hasRole("COMPANY")
                        // Every admin tier (reviewer/admin/super_admin, all carry ROLE_ADMIN —
                        // see JwtAuthenticationFilter) can list team members; only super_admin
                        // (LEVEL_SUPER_ADMIN) can create or remove one. Declared before the
                        // narrower-looking but later-matched general /api/admin/** rule below
                        // for the same declaration-order reason as /api/jobs/pending above.
                        .requestMatchers(HttpMethod.POST, "/api/admin/team")
                        .hasAuthority("LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/team/*")
                        .hasAuthority("LEVEL_SUPER_ADMIN")
                        // Hard-deleting a candidate/company account (AdminAccountDeletionService)
                        // is admin/super_admin only, unlike suspend/reactivate/feature just below
                        // it in AdminUserController, which stay reviewer-reachable via the
                        // general ROLE_ADMIN rule further down.
                        .requestMatchers(HttpMethod.DELETE, "/api/admin/users/*")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Everything below is admin-tier but NOT reviewer — approvals
                        // (/api/admin/companies/**, /api/jobs/pending, /api/ideas/pending, ...)
                        // and user management (/api/admin/users/**) are reviewer's whole scope,
                        // covered by the general ROLE_ADMIN rule further down; these are
                        // everything else in the admin console.
                        .requestMatchers(
                                "/api/admin/team",
                                "/api/admin/dashboard/**",
                                "/api/admin/reports/**",
                                "/api/admin/billing/**",
                                "/api/admin/company-billing/**",
                                "/api/admin/candidate-billing/**",
                                "/api/admin/mock-interview-questions/**",
                                "/api/admin/broadcast-email/**")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")
                        // /mine, /pending and /*/approve, /*/reject must be declared before the
                        // general GET /api/ideas/** permitAll rule below — same
                        // declaration-order caveat as /api/jobs/pending above.
                        .requestMatchers(HttpMethod.GET, "/api/ideas/mine")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        .requestMatchers(HttpMethod.GET, "/api/ideas/pending")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/ideas/*/approve", "/api/ideas/*/reject")
                        .hasRole("ADMIN")
                        // Idea-featuring lives on the admin Ideas page (ADMIN/SUPER_ADMIN only,
                        // not reviewer) — same tier split as the job-featuring rule above.
                        .requestMatchers(HttpMethod.POST, "/api/ideas/*/feature", "/api/ideas/*/unfeature")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Admin hard delete (AdminIdeasPage) — a distinct path from the
                        // submitter-scoped DELETE /api/ideas/* below, so no declaration-order
                        // conflict with it either way.
                        .requestMatchers(HttpMethod.DELETE, "/api/ideas/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // Admin create/edit/detail-read (AdminIdeasPage) — same tier and same
                        // structurally-distinct-pattern reasoning as the admin job rules above;
                        // "/api/ideas/*/admin" and "/api/ideas/admin" don't overlap with the
                        // owner-scoped/permitAll rules for "/api/ideas"/"/api/ideas/*" below.
                        .requestMatchers(HttpMethod.POST, "/api/ideas/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/ideas/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/ideas/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        // GET (browse/detail) is public — anyone can read the community ideas
                        // page (see IdeasBrowsePage); IdeaService.get() still hides
                        // PENDING/REJECTED ideas from everyone but their own submitter. Both
                        // candidates and companies can submit/edit ideas (see IdeasBrowsePage's
                        // "Submit your idea" CTA).
                        .requestMatchers(HttpMethod.GET, "/api/ideas", "/api/ideas/*")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/ideas")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        .requestMatchers(HttpMethod.PUT, "/api/ideas/*")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        .requestMatchers(HttpMethod.DELETE, "/api/ideas/*")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        .requestMatchers(HttpMethod.POST, "/api/ideas/*/interests")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        // A distinct literal path (not "/api/ideas/{id}/interests" — id would
                        // never be the literal string "interests"), but still needs its own rule
                        // since it doesn't fall under any broader permitAll pattern above.
                        .requestMatchers(HttpMethod.GET, "/api/ideas/interests/mine")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        // Owner-only (IdeaService.getInterests enforces it) — any authenticated
                        // candidate/company can call this, but only sees a real list for ideas
                        // they themselves submitted.
                        .requestMatchers(HttpMethod.GET, "/api/ideas/*/interests")
                        .hasAnyRole("CANDIDATE", "COMPANY")
                        .requestMatchers(HttpMethod.POST, "/api/applications", "/api/applications/*/withdraw")
                        .hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.GET, "/api/applications/mine")
                        .hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/status")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.GET, "/api/applications/job/*")
                        .hasRole("COMPANY")
                        // Admin read of any candidate's application history — see
                        // ApplicationController#forCandidate. Three-segment pattern, structurally
                        // distinct from the two-segment "/api/applications/job/*" above, so no
                        // declaration-order conflict either way.
                        .requestMatchers(HttpMethod.GET, "/api/applications/candidate/*/admin")
                        .hasAnyAuthority("LEVEL_ADMIN", "LEVEL_SUPER_ADMIN")
                        .requestMatchers("/api/candidate/**")
                        .hasRole("CANDIDATE")
                        .requestMatchers("/api/company/**")
                        .hasRole("COMPANY")
                        // The notification bell in Header.tsx is shared across every
                        // authenticated role — candidate, company, and admin all get
                        // notifications addressed to them (see NotificationService).
                        .requestMatchers("/api/notifications/**")
                        .authenticated()
                        .anyRequest()
                        .authenticated())
                // Plain 401 for missing/invalid auth on protected routes, matching REST API
                // convention — Spring Security's unconfigured default is a 403 with no
                // WWW-Authenticate challenge, which reads as "forbidden" rather than
                // "not authenticated" to API clients. Pairing it with an explicit
                // accessDeniedHandler matters just as much: without one, an *authenticated* but
                // insufficiently-privileged request (e.g. a reviewer hitting /api/admin/reports)
                // was also landing on the entry point above and coming back 401 instead of 403 —
                // only reproducible against a real server, not MockMvc, which is why the existing
                // test suite never caught it.
                .exceptionHandling(eh -> eh.authenticationEntryPoint(
                                (request, response, authException) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                response.sendError(HttpServletResponse.SC_FORBIDDEN)))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                // Runs before JWT parsing so an abusive caller is rejected as cheaply as possible.
                .addFilterBefore(authRateLimitFilter, JwtAuthenticationFilter.class)
                // CSRF backstop for /api/auth/refresh and /api/auth/logout (the only two
                // endpoints authenticated purely via cookie, with no bearer token) — see
                // AuthOriginCheckFilter. Runs first so a bad-origin request doesn't even count
                // against the rate limit above.
                .addFilterBefore(authOriginCheckFilter, AuthRateLimitFilter.class);
        return http.build();
    }
}
