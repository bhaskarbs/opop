package com.openopportunity.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

@ExtendWith(MockitoExtension.class)
class KafkaNotificationEventPublisherTest {

    @Mock
    private KafkaTemplate<String, NotificationEvent> kafkaTemplate;

    @Test
    void publishesToTheNotificationsTopicKeyedByRecipient() {
        KafkaNotificationEventPublisher publisher = new KafkaNotificationEventPublisher(kafkaTemplate);
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();

        publisher.publish(notificationId, recipientId, "message", "/link");

        ArgumentCaptor<NotificationEvent> eventCaptor = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(kafkaTemplate).send(eq("notifications"), eq(recipientId.toString()), eventCaptor.capture());
        assertThat(eventCaptor.getValue())
                .isEqualTo(new NotificationEvent(notificationId, recipientId, "message", "/link"));
    }
}
