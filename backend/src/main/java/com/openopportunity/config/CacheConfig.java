package com.openopportunity.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * In-process cache (no external service) for read-heavy, tolerant-of-staleness data — first
 * consumer is {@link com.openopportunity.admin.AdminReportsService}, whose dashboard methods
 * each fan out across several repositories on every load. A 60s TTL keeps the dashboard within
 * a refresh-and-see window of any admin action without needing explicit eviction on every write
 * path that could affect the numbers. If this later needs to be shared across multiple backend
 * instances, swap the {@link CaffeineCacheManager} bean here for a Redis-backed
 * {@code CacheManager} — the {@code @Cacheable} call sites don't change.
 */
@Configuration
@EnableCaching
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
