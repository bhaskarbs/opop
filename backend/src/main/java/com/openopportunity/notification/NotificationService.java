package com.openopportunity.notification;

import com.openopportunity.notification.dto.NotificationSummary;
import com.openopportunity.notification.exception.NotificationNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    /** Called by other domain services (JobService, IdeaService, AdminCompanyService,
     * ApplicationService) as a side effect of their own state changes — this class owns no
     * business logic of its own. link is an app-relative route with no /:lang prefix (the
     * frontend adds that); pass null when there's nothing to navigate to. */
    @Transactional
    public void notify(UUID recipientUserId, NotificationType type, String message, String link) {
        notificationRepository.save(new Notification(recipientUserId, type, message, link));
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
