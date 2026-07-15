package com.openopportunity.auth;

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
@Table(name = "company_profiles")
public class CompanyProfile {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true, updatable = false)
    private UUID userId;

    @Column(name = "entity_type")
    private String entityType;

    @Column
    private String cin;

    @Column
    private String gstin;

    @Column
    private String pan;

    @Column
    private String industry;

    @Column(columnDefinition = "text")
    private String address;

    @Column(name = "signatory_name")
    private String signatoryName;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    private VerificationStatus verificationStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CompanyProfile() {
        // JPA
    }

    public CompanyProfile(
            UUID userId,
            String entityType,
            String cin,
            String gstin,
            String pan,
            String industry,
            String address,
            String signatoryName) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.entityType = entityType;
        this.cin = cin;
        this.gstin = gstin;
        this.pan = pan;
        this.industry = industry;
        this.address = address;
        this.signatoryName = signatoryName;
        this.verificationStatus = VerificationStatus.PENDING;
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

    public boolean isVerified() {
        return verificationStatus == VerificationStatus.VERIFIED;
    }

    /** True once every verification field has been filled in (via updateDetails) — a company
     * created through Google sign-in starts with all of them blank, since Google never
     * supplies CIN/GSTIN/PAN/etc. Posting jobs and contacting candidates require this AND
     * isVerified() — see JobService.create(). */
    public boolean isProfileComplete() {
        return isNotBlank(entityType)
                && isNotBlank(cin)
                && isNotBlank(gstin)
                && isNotBlank(pan)
                && isNotBlank(industry)
                && isNotBlank(address)
                && isNotBlank(signatoryName);
    }

    public void updateDetails(
            String entityType,
            String cin,
            String gstin,
            String pan,
            String industry,
            String address,
            String signatoryName) {
        this.entityType = entityType;
        this.cin = cin;
        this.gstin = gstin;
        this.pan = pan;
        this.industry = industry;
        this.address = address;
        this.signatoryName = signatoryName;
    }

    public void verify() {
        this.verificationStatus = VerificationStatus.VERIFIED;
    }

    public void reject() {
        this.verificationStatus = VerificationStatus.REJECTED;
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getCin() {
        return cin;
    }

    public String getGstin() {
        return gstin;
    }

    public String getPan() {
        return pan;
    }

    public String getIndustry() {
        return industry;
    }

    public String getAddress() {
        return address;
    }

    public String getSignatoryName() {
        return signatoryName;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
