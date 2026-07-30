package com.openopportunity.jobalert;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.WorkMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** A candidate's saved search — matched against new jobs nightly by JobAlertDigestService,
 * reusing the same JobSpecifications the public search bar uses. experienceLevel/workMode are
 * single optional filters (unlike keywords/locations, JobSearchPage's search bar only ever
 * lets a candidate pick one level/mode via FilterSidebar's radio-style toggles at a time). */
@Entity
@Table(name = "job_alerts")
public class JobAlert {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> keywords;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> locations;

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", length = 20)
    private ExperienceLevel experienceLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_mode", length = 20)
    private WorkMode workMode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "last_notified_at", nullable = false)
    private Instant lastNotifiedAt;

    protected JobAlert() {
        // JPA
    }

    public JobAlert(
            UUID candidateId,
            List<String> keywords,
            List<String> locations,
            ExperienceLevel experienceLevel,
            WorkMode workMode) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.keywords = keywords;
        this.locations = locations;
        this.experienceLevel = experienceLevel;
        this.workMode = workMode;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        lastNotifiedAt = now;
    }

    public void markNotified(Instant at) {
        this.lastNotifiedAt = at;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public List<String> getLocations() {
        return locations;
    }

    public ExperienceLevel getExperienceLevel() {
        return experienceLevel;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getLastNotifiedAt() {
        return lastNotifiedAt;
    }
}
