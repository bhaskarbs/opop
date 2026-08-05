package com.openopportunity.notification;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** The actual "send this notification's email, then mark it sent" work — shared by both
 * NotificationEventPublisher implementations: {@code InProcessNotificationEventPublisher} calls
 * this directly, {@code NotificationEventConsumer} calls it from a Kafka listener once
 * app.events.provider=kafka. Extracted so that logic exists exactly once regardless of which
 * transport got the event here.
 *
 * <p>Still uses AsyncEmailSender/emailTaskExecutor underneath either way — that wrapper solves a
 * different problem (don't block on a real SMTP round trip) than the event transport does (how
 * the "a notification was created" fact gets from NotificationService.notify() to here), so it
 * stays regardless of which NotificationEventPublisher is active. */
@Component
public class NotificationEmailDispatcher {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final AsyncEmailSender asyncEmailSender;
    private final String frontendBaseUrl;

    public NotificationEmailDispatcher(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            AsyncEmailSender asyncEmailSender,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.asyncEmailSender = asyncEmailSender;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public void dispatch(UUID notificationId, UUID recipientUserId, String message, String link) {
        User recipient = userRepository.findById(recipientUserId).orElse(null);
        if (recipient == null) {
            return;
        }
        EmailButton button =
                link == null ? null : new EmailButton("View on OpenOpportunity", frontendBaseUrl + "/en" + link);
        asyncEmailSender.sendBestEffort(
                recipient.getEmail(),
                "OpenOpportunity notification",
                "You have a new notification",
                List.of(message),
                button,
                () -> markEmailSent(notificationId));
    }

    private void markEmailSent(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.markEmailSent();
            notificationRepository.save(notification);
        });
    }
}
