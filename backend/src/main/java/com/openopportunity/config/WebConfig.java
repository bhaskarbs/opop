package com.openopportunity.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Single source of truth for CORS, consumed by Spring Security's {@code .cors(...)} in
 * {@link SecurityConfig}. It has to be Security-aware (not just a WebMvcConfigurer
 * registration) so preflight OPTIONS requests to authenticated routes are resolved by
 * Security's CorsFilter before the authorization check, instead of being rejected as
 * unauthenticated. {@code app.cors.allowed-origins} lets each environment set its own
 * origin without a code change — locally, the Vite dev server at localhost:5173.
 */
@Configuration
public class WebConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
