package com.openopportunity.savedjob;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/** A candidate's bookmark on a job — just a pointer (candidateId, jobId); see V48 migration for
 * why nothing about the job itself is denormalized here. */
@Entity
@Table(
        name = "saved_jobs",
        uniqueConstraints = @UniqueConstraint(name = "saved_jobs_candidate_job_key", columnNames = {"candidate_id", "job_id"}))
public class SavedJob {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Column(name = "job_id", nullable = false, updatable = false)
    private UUID jobId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SavedJob() {
        // JPA
    }

    public SavedJob(UUID candidateId, UUID jobId) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.jobId = jobId;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public UUID getJobId() {
        return jobId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
