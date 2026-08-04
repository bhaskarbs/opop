package com.openopportunity.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * In-process cache (no external service) for read-heavy, tolerant-of-staleness data — first
 * consumer is {@link com.openopportunity.admin.AdminReportsService}, whose dashboard methods
 * each fan out across several repositories on every load. A 60s TTL keeps the dashboard within
 * a refresh-and-see window of any admin action without needing explicit eviction on every write
 * path that could affect the numbers. The local-first default (app.cache.provider=caffeine); see
 * {@link RedisCacheConfig} for the shared-across-instances alternative
 * (app.cache.provider=redis) — the {@code @Cacheable} call sites don't change either way.
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "app.cache.provider", havingValue = "caffeine", matchIfMissing = true)
public class CacheConfig {

    @Bean
    public CaffeineCacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                "adminCandidateStats",
                "adminPartnershipStats",
                "adminCommunityInterestSubmissions",
                "adminFinancialStats",
                "adminEmployerStats");
        cacheManager.setCaffeine(
                Caffeine.newBuilder().expireAfterWrite(60, TimeUnit.SECONDS).maximumSize(100));
        return cacheManager;
    }
}
