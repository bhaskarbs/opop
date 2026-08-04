package com.openopportunity.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * The one place in the app that talks to Google Analytics 4 directly (mirrors EmailService's
 * role for mail) — every backend-originated product event (job posted, application submitted,
 * user registered) goes through here via GA4's Measurement Protocol
 * (https://developers.google.com/analytics/devguides/collection/protocol/ga4), a plain HTTPS
 * POST rather than a heavier SDK. A no-op when app.ga.measurement-id or app.ga.api-secret is
 * blank (the default; see application.properties), so no GA4 property is needed to build or run
 * the app locally. Sent fire-and-forget over HttpClient's async API so a slow/unreachable
 * network never blocks the caller (same reasoning as AsyncEmailSender).
 */
@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);
    private static final String ENDPOINT = "https://www.google-analytics.com/mp/collect";

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String measurementId;
    private final String apiSecret;

    public AnalyticsService(
            @Value("${app.ga.measurement-id}") String measurementId,
            @Value("${app.ga.api-secret}") String apiSecret) {
        this.measurementId = measurementId;
        this.apiSecret = apiSecret;
    }

    public void capture(UUID distinctId, String event, Map<String, Object> properties) {
        if (measurementId.isBlank() || apiSecret.isBlank()) {
            return;
        }
        try {
            String body = objectMapper.writeValueAsString(Map.of(
                    "client_id", distinctId.toString(),
                    "events", List.of(Map.of("name", event, "params", properties))));
            String query = "measurement_id=" + encode(measurementId) + "&api_secret=" + encode(apiSecret);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ENDPOINT + "?" + query))
                    .header("Content-Type", "application/json")
                    .POST(BodyPublishers.ofString(body))
                    .build();
            httpClient
                    .sendAsync(request, HttpResponse.BodyHandlers.discarding())
                    .exceptionally(ex -> {
                        log.warn("Could not send GA4 event {}: {}", event, ex.getMessage());
                        return null;
                    });
        } catch (Exception ex) {
            log.warn("Could not build GA4 event {}: {}", event, ex.getMessage());
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
