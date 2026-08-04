package com.openopportunity.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * A second, narrowly-scoped filter chain for {@code /{lang}/jobs/{jobId}} (see JobSeoController)
 * — public, and with a CSP relaxed just enough to emit a JSON-LD {@code <script>} block, unlike
 * the main SecurityConfig chain's {@code default-src 'none'}, which assumes this backend never
 * serves real HTML at all. {@code @Order(1)} makes this chain match first; every other request
 * (including the JSON API at the very similar-looking {@code /api/jobs/*}) still falls through
 * to SecurityConfig's chain, which remains unordered (implicitly last).
 */
@Configuration
public class SeoSecurityConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain jobSeoFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/en/jobs/*", "/hi/jobs/*")
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                // Every job/company field this page renders is HTML-escaped, and the JSON-LD
                // block is additionally guarded against "</script>" breakout (see
                // JobSeoService) — 'unsafe-inline' here only permits that one server-controlled,
                // properly-escaped script block, not arbitrary injected markup.
                .headers(headers -> headers.contentSecurityPolicy(
                        csp -> csp.policyDirectives("default-src 'none'; script-src 'unsafe-inline'")));
        return http.build();
    }
}
