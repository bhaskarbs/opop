package com.openopportunity.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class RedisRateLimiterTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Test
    void allowsWhenTheScriptReturnsACountAtOrBelowTheMax() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(Object[].class))).thenReturn(2L);
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);

        assertThat(limiter.tryAcquire("key", 2, Duration.ofMinutes(5))).isTrue();
    }

    @Test
    void blocksWhenTheScriptReturnsACountAboveTheMax() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(Object[].class))).thenReturn(3L);
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);

        assertThat(limiter.tryAcquire("key", 2, Duration.ofMinutes(5))).isFalse();
    }

    @Test
    void passesTheKeyAndTheWindowInSecondsToTheScript() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(Object[].class))).thenReturn(1L);
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);

        limiter.tryAcquire("auth-rate-limit:10.0.0.1", 5, Duration.ofMinutes(2));

        org.mockito.Mockito.verify(redisTemplate)
                .execute(any(RedisScript.class), eq(List.of("auth-rate-limit:10.0.0.1")), eq("120"));
    }

    @Test
    void failsOpenWhenRedisIsUnreachable() {
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(Object[].class)))
                .thenThrow(new QueryTimeoutException("timed out"));
        RedisRateLimiter limiter = new RedisRateLimiter(redisTemplate);

        assertThat(limiter.tryAcquire("key", 1, Duration.ofMinutes(5))).isTrue();
    }
}
