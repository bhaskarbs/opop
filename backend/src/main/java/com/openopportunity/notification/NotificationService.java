package com.openopportunity.notification;

import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.notification.dto.NotificationSummary;
import com.openopportunity.notification.exception.NotificationNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationEventPublisher notificationEventPublisher;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            NotificationEventPublisher notificationEventPublisher) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.notificationEventPublisher = notificationEventPublisher;
    }

    /** Called by other domain services (JobService, IdeaService, AdminCompanyService,
     * ApplicationService) as a side effect of their own state changes — this class owns no
     * business logic of its own. link is an app-relative route with no /:lang prefix (the
     * frontend adds that); pass null when there's nothing to navigate to.
     *
     * <p>The notification row itself is always written synchronously, right here — but the
     * actual email send is a side effect handed off to NotificationEventPublisher (in-process by
     * default, or a real Kafka topic once app.events.provider=kafka — see its javadoc), so a
     * delivery failure (e.g. no SMTP credentials configured locally, see spring.mail.username in
     * application.properties) never fails the caller's own operation. This notification's
     * emailSent flag only flips to true once that send actually succeeds (see
     * getEmailSentCount, which backs the company dashboard's real sent count). */
    @Transactional
    public void notify(UUID recipientUserId, NotificationType type, String message, String link) {
        Notification notification =
                notificationRepository.save(new Notification(recipientUserId, type, message, link));
        notificationEventPublisher.publish(notification.getId(), recipientUserId, message, link);
    }

    /** Fans notify() out to every ADMIN user — for events that need platform-staff attention
     * (a new job/idea entering the review queue, a company profile becoming ready for
     * verification) rather than any specific candidate/company recipient. */
    @Transactional
    public void notifyAdmins(NotificationType type, String message, String link) {
        userRepository.findByRole(UserRole.ADMIN).forEach(admin -> notify(admin.getId(), type, message, link));
    }

    @Transactional(readOnly = true)
    public List<NotificationSummary> getMine(UUID userId) {
        return notificationRepository.findTop20ByRecipientUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByRecipientUserIdAndReadFalse(userId);
    }

    /** Backs the company dashboard's "Notifications sent" stat — a real count of notifications
     * that were actually emailed (see notify() above), not the total number of in-app
     * notifications created. */
    @Transactional(readOnly = true)
    public long getEmailSentCount(UUID userId) {
        return notificationRepository.countByRecipientUserIdAndEmailSentTrue(userId);
    }

    /** Same 404-for-not-found-and-not-owned treatment as MockInterviewService.findOwned — a
     * non-owner can't tell an unknown id apart from someone else's notification. */
    @Transactional
    public NotificationSummary markRead(UUID id, UUID userId) {
        Notification notification = notificationRepository
                .findById(id)
                .filter(existing -> existing.getRecipientUserId().equals(userId))
                .orElseThrow(() -> new NotificationNotFoundException(id));
        notification.markRead();
        return toSummary(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByRecipientUserIdAndReadFalse(userId);
        unread.forEach(Notification::markRead);
        notificationRepository.saveAll(unread);
    }

    private NotificationSummary toSummary(Notification notification) {
        return new NotificationSummary(
                notification.getId(),
                notification.getType(),
                notification.getMessage(),
                notification.getLink(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
