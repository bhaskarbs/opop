package com.openopportunity.notification;

import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** The local-first default (app.events.provider=inprocess, or unset) — dispatches the
 * notification email directly, in the same JVM, with no message broker involved. Correct and
 * dependency-free for a single instance; see {@link KafkaNotificationEventPublisher} for the
 * durable, multi-consumer-ready alternative. */
@Component
@ConditionalOnProperty(name = "app.events.provider", havingValue = "inprocess", matchIfMissing = true)
public class InProcessNotificationEventPublisher implements NotificationEventPublisher {

    private final NotificationEmailDispatcher notificationEmailDispatcher;

    public InProcessNotificationEventPublisher(NotificationEmailDispatcher notificationEmailDispatcher) {
        this.notificationEmailDispatcher = notificationEmailDispatcher;
    }

    @Override
    public void publish(UUID notificationId, UUID recipientUserId, String message, String link) {
        notificationEmailDispatcher.dispatch(notificationId, recipientUserId, message, link);
    }
}
