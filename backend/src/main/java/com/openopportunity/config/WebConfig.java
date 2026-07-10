package com.openopportunity.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the Vite dev server (localhost:5173) to call this API directly during local
 * development. {@code app.cors.allowed-origins} is externalized so each deployed
 * environment can set its own origin without a code change.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("#{'${app.cors.allowed-origins}'.split(',')}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry
                .addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
