package com.openopportunity.analytics;

import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AnalyticsServiceTest {

    // Same blank-config-disables-the-feature pattern as CandidateBillingService's razorpayClient
    // — no GA4 property is needed to build or run the app locally (see application.properties).
    @Test
    void captureIsANoOpWhenMeasurementIdIsBlank() {
        AnalyticsService analyticsService = new AnalyticsService("", "some-secret");

        assertThatCode(() -> analyticsService.capture(
                        UUID.randomUUID(), "user_registered", Map.of("role", "CANDIDATE")))
                .doesNotThrowAnyException();
    }

    @Test
    void captureIsANoOpWhenApiSecretIsBlank() {
        AnalyticsService analyticsService = new AnalyticsService("G-TEST123", "");

        assertThatCode(() -> analyticsService.capture(
                        UUID.randomUUID(), "user_registered", Map.of("role", "CANDIDATE")))
                .doesNotThrowAnyException();
    }
}
