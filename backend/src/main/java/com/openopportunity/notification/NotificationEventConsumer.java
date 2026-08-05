package com.openopportunity.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Consumes the "notifications" topic KafkaNotificationEventPublisher publishes to and does the
 * same email dispatch InProcessNotificationEventPublisher would have done directly — the only
 * consumer that exists today, but a real Kafka topic (unlike the in-process default) means
 * another consumer group could subscribe to the same events later without touching
 * NotificationService or its callers. Only created when app.events.provider=kafka, same gate as
 * KafkaNotificationEventPublisher — the two only ever exist together. */
@Component
@ConditionalOnProperty(name = "app.events.provider", havingValue = "kafka")
public class NotificationEventConsumer {

    private final NotificationEmailDispatcher notificationEmailDispatcher;

    public NotificationEventConsumer(NotificationEmailDispatcher notificationEmailDispatcher) {
        this.notificationEmailDispatcher = notificationEmailDispatcher;
    }

    @KafkaListener(topics = KafkaNotificationEventPublisher.TOPIC, groupId = "notification-email-dispatcher")
    public void onNotificationEvent(NotificationEvent event) {
        notificationEmailDispatcher.dispatch(
                event.notificationId(), event.recipientUserId(), event.message(), event.link());
    }
}
