package com.openopportunity.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A white paper or research publication link a candidate has added to their profile — a
 * candidate may have up to CandidateAccomplishmentService.MAX_RESEARCH_PAPERS of these. */
@Entity
@Table(name = "candidate_research_papers")
public class CandidateResearchPaper {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CandidateResearchPaper() {
        // JPA
    }

    public CandidateResearchPaper(UUID candidateId, String title, String url, String description) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.title = title;
        this.url = url;
        this.description = description;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public String getTitle() {
        return title;
    }

    public String getUrl() {
        return url;
    }

    public String getDescription() {
        return description;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
