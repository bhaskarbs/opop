package com.openopportunity.ratelimit;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** The local-first default — in-memory and per-instance, so a multi-instance deployment would
 * have each instance track its own counters and the effective limit would multiply by instance
 * count (see RedisRateLimiter, which a real deployment switches to via
 * app.security.rate-limit.store=redis). Correct and dependency-free as long as there's only one
 * instance, which is the case for local dev/CI and any single-instance deployment. */
@Component
@ConditionalOnProperty(name = "app.security.rate-limit.store", havingValue = "memory", matchIfMissing = true)
public class InMemoryRateLimiter implements RateLimiter {

    private final ConcurrentHashMap<String, Window> windowsByKey = new ConcurrentHashMap<>();

    private static final class Window {
        private final Instant start;
        private final AtomicInteger count;

        private Window(Instant start) {
            this.start = start;
            this.count = new AtomicInteger(1);
        }
    }

    @Override
    public boolean tryAcquire(String key, int maxRequestsPerWindow, Duration window) {
        Instant now = Instant.now();
        Window current = windowsByKey.compute(key, (ignored, existing) -> {
            if (existing == null || Duration.between(existing.start, now).compareTo(window) >= 0) {
                return new Window(now);
            }
            existing.count.incrementAndGet();
            return existing;
        });
        return current.count.get() <= maxRequestsPerWindow;
    }
}
