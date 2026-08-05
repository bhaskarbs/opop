package com.openopportunity.notification;

import static org.mockito.Mockito.verify;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InProcessNotificationEventPublisherTest {

    @Mock
    private NotificationEmailDispatcher notificationEmailDispatcher;

    @Test
    void delegatesDirectlyToTheDispatcher() {
        InProcessNotificationEventPublisher publisher =
                new InProcessNotificationEventPublisher(notificationEmailDispatcher);
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();

        publisher.publish(notificationId, recipientId, "message", "/link");

        verify(notificationEmailDispatcher).dispatch(notificationId, recipientId, "message", "/link");
    }
}
