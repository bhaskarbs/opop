package com.openopportunity.notification;

import static org.mockito.Mockito.verify;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationEventConsumerTest {

    @Mock
    private NotificationEmailDispatcher notificationEmailDispatcher;

    @Test
    void dispatchesTheEmailForTheConsumedEvent() {
        NotificationEventConsumer consumer = new NotificationEventConsumer(notificationEmailDispatcher);
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();
        NotificationEvent event = new NotificationEvent(notificationId, recipientId, "message", "/link");

        consumer.onNotificationEvent(event);

        verify(notificationEmailDispatcher).dispatch(notificationId, recipientId, "message", "/link");
    }
}
