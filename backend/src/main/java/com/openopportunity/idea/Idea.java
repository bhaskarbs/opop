package com.openopportunity.idea;

import com.openopportunity.auth.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ideas")
public class Idea {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "submitter_id", nullable = false, updatable = false)
    private UUID submitterId;

    @Column(name = "submitter_name", nullable = false)
    private String submitterName;

    @Enumerated(EnumType.STRING)
    @Column(name = "submitter_role", nullable = false, length = 20, updatable = false)
    private UserRole submitterRole;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IdeaStage stage;

    @Column(nullable = false, columnDefinition = "text")
    private String problem;

    @Column(nullable = false, columnDefinition = "text")
    private String solution;

    @Column(name = "target_market", nullable = false)
    private String targetMarket;

    @Column
    private String funding;

    @Column
    private String equity;

    @Column(name = "team_size")
    private Integer teamSize;

    @Column
    private String timeline;

    @Column(name = "video_link")
    private String videoLink;

    @Column(name = "contact_email", nullable = false)
    private String contactEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private IdeaStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Idea() {
        // JPA
    }

    public Idea(
            UUID submitterId,
            String submitterName,
            UserRole submitterRole,
            String title,
            String category,
            IdeaStage stage,
            String problem,
            String solution,
            String targetMarket,
            String funding,
            String equity,
            Integer teamSize,
            String timeline,
            String videoLink,
            String contactEmail) {
        this.id = UUID.randomUUID();
        this.submitterId = submitterId;
        this.submitterName = submitterName;
        this.submitterRole = submitterRole;
        this.title = title;
        this.category = category;
        this.stage = stage;
        this.problem = problem;
        this.solution = solution;
        this.targetMarket = targetMarket;
        this.funding = funding;
        this.equity = equity;
        this.teamSize = teamSize;
        this.timeline = timeline;
        this.videoLink = videoLink;
        this.contactEmail = contactEmail;
        this.status = IdeaStatus.PENDING;
    }

    /** Edits send the idea back to PENDING — an approved/rejected idea's content may have
     * changed enough to need another look, and there's no partial-edit tracking to tell. */
    public void update(
            String title,
            String category,
            IdeaStage stage,
            String problem,
            String solution,
            String targetMarket,
            String funding,
            String equity,
            Integer teamSize,
            String timeline,
            String videoLink,
            String contactEmail) {
        this.title = title;
        this.category = category;
        this.stage = stage;
        this.problem = problem;
        this.solution = solution;
        this.targetMarket = targetMarket;
        this.funding = funding;
        this.equity = equity;
        this.teamSize = teamSize;
        this.timeline = timeline;
        this.videoLink = videoLink;
        this.contactEmail = contactEmail;
        this.status = IdeaStatus.PENDING;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getSubmitterId() {
        return submitterId;
    }

    public String getSubmitterName() {
        return submitterName;
    }

    public UserRole getSubmitterRole() {
        return submitterRole;
    }

    public String getTitle() {
        return title;
    }

    public String getCategory() {
        return category;
    }

    public IdeaStage getStage() {
        return stage;
    }

    public String getProblem() {
        return problem;
    }

    public String getSolution() {
        return solution;
    }

    public String getTargetMarket() {
        return targetMarket;
    }

    public String getFunding() {
        return funding;
    }

    public String getEquity() {
        return equity;
    }

    public Integer getTeamSize() {
        return teamSize;
    }

    public String getTimeline() {
        return timeline;
    }

    public String getVideoLink() {
        return videoLink;
    }

    public String getContactEmail() {
        return contactEmail;
    }

    public IdeaStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
