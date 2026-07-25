package com.openopportunity.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One row per (company, candidate) pair once that company has clicked "View contact" on
 * SearchCandidatesPage — its mere existence is the persisted "already revealed" signal
 * CandidateSearchService checks on every later search/detail call, so the number shows by
 * default on return visits instead of needing another click. */
@Entity
@Table(name = "candidate_contact_reveals")
public class CandidateContactReveal {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "candidate_id", nullable = false)
    private UUID candidateId;

    @Column(name = "revealed_at", nullable = false, updatable = false)
    private Instant revealedAt;

    protected CandidateContactReveal() {
        // JPA
    }

    public CandidateContactReveal(UUID companyId, UUID candidateId) {
        this.id = UUID.randomUUID();
        this.companyId = companyId;
        this.candidateId = candidateId;
    }

    @PrePersist
    void onCreate() {
        revealedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public Instant getRevealedAt() {
        return revealedAt;
    }
}
