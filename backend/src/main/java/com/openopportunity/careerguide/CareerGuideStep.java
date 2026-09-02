package com.openopportunity.careerguide;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One "Step N" entry in the career-guide email (see com.openopportunity.mail.EmailTemplate's
 * renderCareerGuide) — a short description and a video URL to watch, admin-managed via
 * AdminCareerGuideStepService. stepOrder is a plain 1..N sequence the service keeps contiguous
 * (renumbering the rest after every add/delete), not a value the admin sets directly. */
@Entity
@Table(name = "career_guide_steps")
public class CareerGuideStep {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "step_order", nullable = false)
    private int stepOrder;

    @Column(nullable = false, length = 300)
    private String description;

    @Column(name = "video_url", nullable = false, length = 2048)
    private String videoUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CareerGuideStep() {
        // JPA
    }

    public CareerGuideStep(int stepOrder, String description, String videoUrl) {
        this.id = UUID.randomUUID();
        this.stepOrder = stepOrder;
        this.description = description;
        this.videoUrl = videoUrl;
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

    public void update(String description, String videoUrl) {
        this.description = description;
        this.videoUrl = videoUrl;
    }

    public void reorder(int stepOrder) {
        this.stepOrder = stepOrder;
    }

    public UUID getId() {
        return id;
    }

    public int getStepOrder() {
        return stepOrder;
    }

    public String getDescription() {
        return description;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
