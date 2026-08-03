package com.openopportunity.analytics;

import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnalyticsServiceTest {

    // Same blank-key-disables-the-feature pattern as CandidateBillingService's razorpayClient —
    // no PostHog account is needed to build or run the app locally (see application.properties).
    @Test
    void captureIsANoOpWhenNoApiKeyIsConfigured() {
        AnalyticsService analyticsService = new AnalyticsService("", "https://us.i.posthog.com");

        assertThatCode(() -> analyticsService.capture(
                        UUID.randomUUID(), "user_registered", Map.of("role", "CANDIDATE")))
                .doesNotThrowAnyException();
    }
}
