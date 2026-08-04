package com.openopportunity.config;

import java.util.concurrent.Executor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Backs two independent bounded pools:
 *
 * <ul>
 *   <li>{@code emailTaskExecutor}, used by {@link com.openopportunity.mail.AsyncEmailSender} —
 *       every email send blocks on a real SMTP connection (see EmailService), so a burst of
 *       notifications shouldn't be able to spawn an unbounded number of threads all waiting on
 *       it.
 *   <li>{@code resumeRenderExecutor}, used by {@code CandidateSearchService.getResumeHtml} — a
 *       resume's PDF/DOCX/DOC gets parsed synchronously to render the "web view" preview, and a
 *       pathological (but otherwise validly-signed) upload could tie up whatever thread runs
 *       that indefinitely. Running it here with a timeout means a slow parse only ever ties up
 *       one of these bounded worker threads, not the request thread itself, and the request
 *       fails cleanly once the timeout elapses instead of hanging.
 * </ul>
 *
 * Both are bounded instead of using Spring's default unbounded-thread-per-task executor.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // Generous relative to real traffic — mainly headroom so a dense burst (e.g. a big
        // integration test suite running dozens of registration/notification flows back to
        // back) can't saturate this and get TaskRejectedException, now that EmailService also
        // fails fast instead of blocking a thread on a real SMTP round trip when unconfigured.
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(20);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("email-async-");
        executor.initialize();
        return executor;
    }

    @Bean(name = "resumeRenderExecutor")
    public Executor resumeRenderExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("resume-render-");
        executor.initialize();
        return executor;
    }
}
