package com.openopportunity.analytics;

import com.posthog.server.PostHog;
import com.posthog.server.PostHogCaptureOptions;
import com.posthog.server.PostHogConfig;
import com.posthog.server.PostHogInterface;
import jakarta.annotation.PreDestroy;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * The one place in the app that talks to PostHog directly (mirrors EmailService's role for
 * mail) — every backend-originated product event (job posted, application submitted, user
 * registered) goes through here rather than each domain service touching the PostHog SDK
 * itself. A no-op when app.posthog.api-key is blank (the default; see application.properties),
 * so no PostHog account is needed to build or run the app locally. The SDK itself batches and
 * sends off its own internal queue, so capture() never blocks the caller.
 */
@Service
public class AnalyticsService {

    private final PostHogInterface client;

    public AnalyticsService(
            @Value("${app.posthog.api-key}") String apiKey, @Value("${app.posthog.host}") String host) {
        this.client = apiKey.isBlank() ? null : PostHog.with(PostHogConfig.builder(apiKey).host(host).build());
    }

    public void capture(UUID distinctId, String event, Map<String, Object> properties) {
        if (client != null) {
            client.capture(
                    distinctId.toString(),
                    event,
                    PostHogCaptureOptions.builder().properties(properties).build());
        }
    }

    @PreDestroy
    void shutdown() {
        if (client != null) {
            client.flush();
            client.close();
        }
    }
}
