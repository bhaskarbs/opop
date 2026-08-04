package com.openopportunity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisReactiveAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// RedisAutoConfiguration excluded: com.openopportunity.config.RedisRateLimitConfig defines its
// own connection beans, conditionally, only when app.security.rate-limit.store=redis — without
// this exclusion, Spring Boot's default auto-configuration would create a LettuceConnectionFactory
// regardless (the starter is always on the classpath, see build.gradle), and by default that
// factory eager-connects during startup, which would require Redis to be reachable just to start
// the app at all — including locally, where nothing enables Redis in the first place.
@SpringBootApplication(exclude = {RedisAutoConfiguration.class, RedisReactiveAutoConfiguration.class})
@EnableScheduling
public class OpenOpportunityApplication {

	public static void main(String[] args) {
		SpringApplication.run(OpenOpportunityApplication.class, args);
	}

}
