package com.openopportunity.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Only created when app.security.rate-limit.store=redis (see
 * com.openopportunity.ratelimit.RedisRateLimiter, the sole consumer) —
 * OpenOpportunityApplication excludes Spring Boot's own RedisAutoConfiguration, so no Redis
 * connection of any kind exists in the app context unless this fires; no Redis instance is
 * needed to build or run the app locally.
 *
 * <p>Eager initialization is explicitly disabled: Spring Data Redis's default eager-connects the
 * shared connection during context startup, which would require Redis to be reachable before the
 * app can start at all. Deferring to the first actual command instead means a transient Redis
 * blip doesn't take the whole app down with it — RedisRateLimiter also fails open per-request if
 * Redis stays unreachable, same reasoning.
 */
@Configuration
@ConditionalOnProperty(name = "app.security.rate-limit.store", havingValue = "redis")
public class RedisRateLimitConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory(
            @Value("${spring.data.redis.host}") String host,
            @Value("${spring.data.redis.port}") int port,
            @Value("${spring.data.redis.password:}") String password) {
        RedisStandaloneConfiguration serverConfig = new RedisStandaloneConfiguration(host, port);
        if (!password.isBlank()) {
            serverConfig.setPassword(RedisPassword.of(password));
        }
        LettuceClientConfiguration clientConfig =
                LettuceClientConfiguration.builder().commandTimeout(Duration.ofSeconds(3)).build();
        LettuceConnectionFactory factory = new LettuceConnectionFactory(serverConfig, clientConfig);
        factory.setEagerInitialization(false);
        return factory;
    }

    @Bean
    public StringRedisTemplate redisRateLimitTemplate(RedisConnectionFactory redisConnectionFactory) {
        return new StringRedisTemplate(redisConnectionFactory);
    }
}
