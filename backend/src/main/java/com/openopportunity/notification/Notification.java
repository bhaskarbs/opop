package com.openopportunity.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A single notification for the bell in Header.tsx — addressed to any authenticated user
 * (candidate, company, or admin) via recipientUserId, so this is deliberately not scoped under
 * any one role's package. Created as a side effect of existing domain events (see
 * NotificationService callers: JobService, IdeaService, AdminCompanyService,
 * ApplicationService) rather than owning any business logic itself. */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "recipient_user_id", nullable = false, updatable = false)
    private UUID recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40, updatable = false)
    private NotificationType type;

    @Column(nullable = false, columnDefinition = "text", updatable = false)
    private String message;

    @Column(length = 500, updatable = false)
    private String link;

    @Column(nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Notification() {
        // JPA
    }

    public Notification(UUID recipientUserId, NotificationType type, String message, String link) {
        this.id = UUID.randomUUID();
        this.recipientUserId = recipientUserId;
        this.type = type;
        this.message = message;
        this.link = link;
        this.read = false;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public void markRead() {
        this.read = true;
    }

    public UUID getId() {
        return id;
    }

    public UUID getRecipientUserId() {
        return recipientUserId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getMessage() {
        return message;
    }

    public String getLink() {
        return link;
    }

    public boolean isRead() {
        return read;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
