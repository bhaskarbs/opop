package com.openopportunity.idea;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "idea_interests")
public class IdeaInterest {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "idea_id", nullable = false, updatable = false)
    private UUID ideaId;

    @Column(name = "idea_title", nullable = false, updatable = false)
    private String ideaTitle;

    @Column(name = "idea_submitter_name", nullable = false, updatable = false)
    private String ideaSubmitterName;

    @Column(name = "interested_user_id", nullable = false, updatable = false)
    private UUID interestedUserId;

    @Column(name = "interested_user_name", nullable = false, updatable = false)
    private String interestedUserName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private IdeaInterestRole role;

    @Column(name = "ticket_size", updatable = false)
    private String ticketSize;

    @Column(updatable = false, columnDefinition = "text")
    private String message;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected IdeaInterest() {
        // JPA
    }

    public IdeaInterest(
            UUID ideaId,
            String ideaTitle,
            String ideaSubmitterName,
            UUID interestedUserId,
            String interestedUserName,
            IdeaInterestRole role,
            String ticketSize,
            String message) {
        this.id = UUID.randomUUID();
        this.ideaId = ideaId;
        this.ideaTitle = ideaTitle;
        this.ideaSubmitterName = ideaSubmitterName;
        this.interestedUserId = interestedUserId;
        this.interestedUserName = interestedUserName;
        this.role = role;
        this.ticketSize = ticketSize;
        this.message = message;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getIdeaId() {
        return ideaId;
    }

    public String getIdeaTitle() {
        return ideaTitle;
    }

    public String getIdeaSubmitterName() {
        return ideaSubmitterName;
    }

    public UUID getInterestedUserId() {
        return interestedUserId;
    }

    public String getInterestedUserName() {
        return interestedUserName;
    }

    public IdeaInterestRole getRole() {
        return role;
    }

    public String getTicketSize() {
        return ticketSize;
    }

    public String getMessage() {
        return message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
