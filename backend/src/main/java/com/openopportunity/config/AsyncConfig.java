package com.openopportunity.config;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Backs {@link com.openopportunity.mail.AsyncEmailSender} — a bounded pool instead of Spring's
 * default unbounded-thread-per-task executor, since every email send blocks on a real SMTP
 * connection (see EmailService) and a burst of notifications shouldn't be able to spawn an
 * unbounded number of threads all waiting on it.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("email-async-");
        executor.initialize();
        return executor;
    }
}
