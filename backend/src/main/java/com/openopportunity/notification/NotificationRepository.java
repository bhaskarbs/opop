package com.openopportunity.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findTop20ByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId);

    List<Notification> findByRecipientUserIdAndReadFalse(UUID recipientUserId);

    long countByRecipientUserIdAndReadFalse(UUID recipientUserId);

    long countByRecipientUserIdAndEmailSentTrue(UUID recipientUserId);

    // Used only by admin hard-delete (AdminAccountDeletionService) — notifications has no
    // DB-level FK to users, so this cleanup is entirely application-managed.
    void deleteByRecipientUserId(UUID recipientUserId);
}
