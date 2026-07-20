package com.openopportunity.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findTop20ByRecipientUserIdOrderByCreatedAtDesc(UUID recipientUserId);

    List<Notification> findByRecipientUserIdAndReadFalse(UUID recipientUserId);

    long countByRecipientUserIdAndReadFalse(UUID recipientUserId);
}
