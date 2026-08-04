package com.openopportunity.ratelimit;

import java.time.Duration;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/** Shares rate-limit counters across every app instance via Redis (see
 * com.openopportunity.config.RedisRateLimitConfig for the connection, and
 * app.security.rate-limit.store=redis to enable this over InMemoryRateLimiter, the local-first
 * default) — the correctness fix InMemoryRateLimiter's own Javadoc calls out: per-instance
 * counters mean the effective limit multiplies by however many instances are running. */
@Component
@ConditionalOnProperty(name = "app.security.rate-limit.store", havingValue = "redis")
public class RedisRateLimiter implements RateLimiter {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimiter.class);

    // INCR, then set the key's expiry only on the increment that just created it (current == 1)
    // — one atomic script rather than a separate INCR + EXPIRE, since two non-atomic calls could
    // interleave with another instance's and leave the key incremented but never expiring.
    private static final RedisScript<Long> INCREMENT_AND_EXPIRE = new DefaultRedisScript<>(
            """
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
            """,
            Long.class);

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /** Fails open (allows the request) if Redis itself is unreachable — a rate limiter that can
     * take the whole app down because a shared dependency hiccuped would be a worse outcome than
     * briefly losing the throttling it provides. */
    @Override
    public boolean tryAcquire(String key, int maxRequestsPerWindow, Duration window) {
        try {
            Long count = redisTemplate.execute(INCREMENT_AND_EXPIRE, List.of(key), String.valueOf(window.toSeconds()));
            return count == null || count <= maxRequestsPerWindow;
        } catch (DataAccessException ex) {
            log.warn("Redis rate limiter unavailable, allowing request for key {}: {}", key, ex.getMessage());
            return true;
        }
    }
}
