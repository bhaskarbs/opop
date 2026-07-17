package com.openopportunity.config;

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
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter)
            throws Exception {
        http.cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/google",
                                "/api/auth/google/company",
                                "/api/auth/refresh",
                                "/api/auth/logout")
                        .permitAll()
                        // /mine and /pending must be declared before the general GET
                        // /api/jobs/** permitAll rule below — authorizeHttpRequests matches in
                        // declaration order, and both would otherwise also match that broader
                        // single-segment pattern.
                        .requestMatchers(HttpMethod.GET, "/api/jobs/mine")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.GET, "/api/jobs/pending")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/jobs/*/approve", "/api/jobs/*/reject")
                        .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/jobs", "/api/jobs/*")
                        .permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/jobs")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.PUT, "/api/jobs/*")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.DELETE, "/api/jobs/*")
                        .hasRole("COMPANY")
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
                        .requestMatchers(HttpMethod.POST, "/api/applications", "/api/applications/*/withdraw")
                        .hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.GET, "/api/applications/mine")
                        .hasRole("CANDIDATE")
                        .requestMatchers(HttpMethod.PATCH, "/api/applications/*/status")
                        .hasRole("COMPANY")
                        .requestMatchers(HttpMethod.GET, "/api/applications/job/*")
                        .hasRole("COMPANY")
                        .requestMatchers("/api/candidate/**")
                        .hasRole("CANDIDATE")
                        .requestMatchers("/api/company/**")
                        .hasRole("COMPANY")
                        .anyRequest()
                        .authenticated())
                // Plain 401 for missing/invalid auth on protected routes, matching REST API
                // convention — Spring Security's unconfigured default is a 403 with no
                // WWW-Authenticate challenge, which reads as "forbidden" rather than
                // "not authenticated" to API clients.
                .exceptionHandling(eh -> eh.authenticationEntryPoint(
                        (request, response, authException) -> response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
