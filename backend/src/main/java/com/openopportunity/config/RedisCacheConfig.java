package com.openopportunity.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

/**
 * Shares {@code @Cacheable} entries (see AdminReportsService) across every app instance via
 * Redis, instead of each instance keeping its own in-process cache — see CacheConfig, the
 * local-first default, for the correctness gap this closes: per-instance caching means a cache
 * hit on one instance can still serve stale data an admin action just invalidated on another.
 * Only created when app.cache.provider=redis; no Redis connection of any kind exists in the app
 * context otherwise (see OpenOpportunityApplication's RedisAutoConfiguration exclusion) — no
 * Redis instance is needed to build or run the app locally.
 *
 * <p>Eager initialization is explicitly disabled: Spring Data Redis's default eager-connects the
 * shared connection during context startup, which would require Redis to be reachable before the
 * app can start at all. Deferring to the first actual cache access instead means a transient
 * Redis blip at startup doesn't take the whole app down with it.
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "app.cache.provider", havingValue = "redis")
public class RedisCacheConfig {

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

    // Spring Data Redis's repository infrastructure (active just from having the starter on the
    // classpath, same as JPA/Elasticsearch's repository scanning — see the "Could not safely
    // identify store assignment" log lines at startup) wires up a RedisReferenceResolver that
    // requires a bean literally named "redisTemplate" to exist, even though this app has no
    // @RedisHash entities of its own — excluding RedisAutoConfiguration (which would otherwise
    // provide one) means this has to be defined explicitly instead.
    @Bean
    public RedisTemplate<Object, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        RedisTemplate<Object, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory);
        template.afterPropertiesSet();
        return template;
    }

    // Same cache names and 60s TTL as CaffeineCacheManager (CacheConfig) — the @Cacheable call
    // sites in AdminReportsService don't know or care which CacheManager backs them.
    //
    // serializeValuesWith is the load-bearing part: RedisCacheConfiguration's own default value
    // serializer is JDK serialization, which requires every cached type to implement
    // Serializable — the admin report DTOs (e.g. AdminCandidateReportStats) are plain records
    // that don't, and Java serialization is the wrong tool for a cache/wire format regardless
    // (fragile across class changes, and deserializing arbitrary Java objects is a real attack
    // surface). JSON has neither problem, and it also means cache entries are human-readable if
    // you ever need to inspect them directly in Redis.
    //
    // The injected ObjectMapper (Spring Boot's own auto-configured bean, already used for every
    // HTTP response in the app) matters here specifically because it has jackson-datatype-jsr310
    // registered — GenericJackson2JsonRedisSerializer's own no-arg default doesn't, and several
    // of these DTOs (e.g. AdminCommunityInterestSummary.submittedAt) carry a java.time.Instant.
    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory, ObjectMapper objectMapper) {
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofSeconds(60))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(
                        new GenericJackson2JsonRedisSerializer(objectMapper)));
        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(defaultConfig)
                .build();
    }
}
