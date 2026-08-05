package com.openopportunity.notification;

import java.util.UUID;

/** The payload published to Kafka once app.events.provider=kafka (see
 * KafkaNotificationEventPublisher/NotificationEventConsumer) — everything
 * NotificationEmailDispatcher needs to send the notification email and mark it sent, without
 * the consumer needing its own database round-trip just to reload what the producer already
 * had in hand. */
public record NotificationEvent(UUID notificationId, UUID recipientUserId, String message, String link) {}
