package com.openopportunity.notification;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/** Publishes to the "notifications" Kafka topic instead of dispatching the email directly (see
 * NotificationEventConsumer, the counterpart that actually calls NotificationEmailDispatcher) —
 * durable across a restart/crash between publish and delivery, unlike the in-process default's
 * pure in-memory thread pool, and the same event stream other consumers (search indexing,
 * analytics) could subscribe to later without NotificationService's callers changing at all.
 * Only created when app.events.provider=kafka.
 *
 * <p>Keyed by recipientUserId so every event for the same recipient lands on the same
 * partition — processed in order, rather than a later notification's email racing ahead of an
 * earlier one's. */
@Component
@ConditionalOnProperty(name = "app.events.provider", havingValue = "kafka")
public class KafkaNotificationEventPublisher implements NotificationEventPublisher {

    static final String TOPIC = "notifications";

    private final KafkaTemplate<String, NotificationEvent> kafkaTemplate;

    public KafkaNotificationEventPublisher(KafkaTemplate<String, NotificationEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public void publish(UUID notificationId, UUID recipientUserId, String message, String link) {
        kafkaTemplate.send(
                TOPIC, recipientUserId.toString(), new NotificationEvent(notificationId, recipientUserId, message, link));
    }
}
