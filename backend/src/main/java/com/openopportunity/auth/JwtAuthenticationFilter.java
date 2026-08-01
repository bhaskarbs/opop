package com.openopportunity.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the {@code Authorization: Bearer <token>} header on every request and, if the token
 * is valid, populates the security context so downstream {@code authorizeHttpRequests} rules
 * can treat the request as authenticated. Missing/invalid tokens are left unauthenticated
 * rather than rejected here — routes that require auth reject on their own via the security
 * filter chain, so public routes stay reachable without a token.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring("Bearer ".length());
            try {
                Claims claims = jwtService.parseAndValidate(token);
                UUID userId = jwtService.extractUserId(claims);
                UserRole role = jwtService.extractRole(claims);
                AdminLevel adminLevel = jwtService.extractAdminLevel(claims);
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
                // A second, finer-grained authority on top of the coarse ROLE_ADMIN above — lets
                // SecurityConfig restrict specific /api/admin/** sub-paths (dashboard, reports,
                // billing, team management) to only some admin tiers, while approvals/users stay
                // open to any admin-tier account via ROLE_ADMIN alone. Not prefixed "ROLE_" since
                // it's checked via hasAuthority(...), not hasRole(...).
                if (adminLevel != null) {
                    authorities.add(new SimpleGrantedAuthority("LEVEL_" + adminLevel.name()));
                }
                Authentication authentication =
                        new UsernamePasswordAuthenticationToken(userId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException ex) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
