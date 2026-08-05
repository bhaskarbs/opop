package com.openopportunity.notification;

import java.util.UUID;

/** How the fact "a notification was just created" gets from NotificationService.notify() to
 * whatever actually sends the email (NotificationEmailDispatcher) — abstracted from the
 * transport so the local-first default ({@link InProcessNotificationEventPublisher}, direct
 * in-process dispatch) and the opt-in one ({@link KafkaNotificationEventPublisher}, a real Kafka
 * topic — see app.events.provider) are interchangeable from NotificationService's point of
 * view. The notification row itself is always written synchronously by NotificationService
 * before this is called; only the email side effect's delivery mechanism varies. */
public interface NotificationEventPublisher {

    void publish(UUID notificationId, UUID recipientUserId, String message, String link);
}
