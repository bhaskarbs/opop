package com.openopportunity.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A professional certification a candidate has added to their profile — a candidate may have
 * up to CandidateAccomplishmentService.MAX_CERTIFICATIONS of these. logoStorageKey/
 * logoContentType stay null until a logo is uploaded (optional, unlike name). */
@Entity
@Table(name = "candidate_certifications")
public class CandidateCertification {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Column(nullable = false)
    private String name;

    @Column(name = "certification_id")
    private String certificationId;

    @Column(name = "certification_url", length = 2048)
    private String certificationUrl;

    @Column(name = "logo_storage_key", length = 500)
    private String logoStorageKey;

    @Column(name = "logo_content_type", length = 100)
    private String logoContentType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CandidateCertification() {
        // JPA
    }

    public CandidateCertification(
            UUID candidateId,
            String name,
            String certificationId,
            String certificationUrl,
            String logoStorageKey,
            String logoContentType) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.name = name;
        this.certificationId = certificationId;
        this.certificationUrl = certificationUrl;
        this.logoStorageKey = logoStorageKey;
        this.logoContentType = logoContentType;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public String getName() {
        return name;
    }

    public String getCertificationId() {
        return certificationId;
    }

    public String getCertificationUrl() {
        return certificationUrl;
    }

    public String getLogoStorageKey() {
        return logoStorageKey;
    }

    public String getLogoContentType() {
        return logoContentType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
