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

    @Column(name = "contact_number")
    private String contactNumber;

    @Column(name = "aadhaar_number")
    private String aadhaarNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 20)
    private VerificationStatus verificationStatus;

    // Where FileStorageService put the uploaded logo bytes, and its content type (needed to set
    // the response Content-Type when serving it back) — null until a logo is uploaded.
    @Column(name = "logo_storage_key", length = 500)
    private String logoStorageKey;

    @Column(name = "logo_content_type", length = 100)
    private String logoContentType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // A company that hasn't formally registered yet has no CIN/GSTIN — this entityType value
    // lets it register with an Aadhaar number instead (see isProfileComplete/requireCompanyProfileFields).
    public static final String UNREGISTERED_ENTITY_TYPE = "Company Not Yet Registered";

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
            String signatoryName,
            String contactNumber,
            String aadhaarNumber) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.entityType = entityType;
        this.cin = cin;
        this.gstin = gstin;
        this.pan = pan;
        this.industry = industry;
        this.address = address;
        this.signatoryName = signatoryName;
        this.contactNumber = contactNumber;
        this.aadhaarNumber = aadhaarNumber;
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
        boolean commonFieldsComplete = isNotBlank(entityType)
                && isNotBlank(pan)
                && isNotBlank(industry)
                && isNotBlank(address)
                && isNotBlank(signatoryName)
                && isNotBlank(contactNumber);
        if (!commonFieldsComplete) {
            return false;
        }
        if (UNREGISTERED_ENTITY_TYPE.equals(entityType)) {
            return isNotBlank(aadhaarNumber);
        }
        return isNotBlank(cin) && isNotBlank(gstin);
    }

    public void updateDetails(
            String entityType,
            String cin,
            String gstin,
            String pan,
            String industry,
            String address,
            String signatoryName,
            String contactNumber,
            String aadhaarNumber) {
        this.entityType = entityType;
        this.cin = cin;
        this.gstin = gstin;
        this.pan = pan;
        this.industry = industry;
        this.address = address;
        this.signatoryName = signatoryName;
        this.contactNumber = contactNumber;
        this.aadhaarNumber = aadhaarNumber;
        // Any edit re-queues the profile for admin review, even if it was previously VERIFIED —
        // see CompanyProfileService.updateProfile, which warns the company of this before saving.
        this.verificationStatus = VerificationStatus.PENDING;
    }

    public void verify() {
        this.verificationStatus = VerificationStatus.VERIFIED;
    }

    public void reject() {
        this.verificationStatus = VerificationStatus.REJECTED;
    }

    public void updateLogo(String logoStorageKey, String logoContentType) {
        this.logoStorageKey = logoStorageKey;
        this.logoContentType = logoContentType;
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

    public String getContactNumber() {
        return contactNumber;
    }

    public String getAadhaarNumber() {
        return aadhaarNumber;
    }

    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
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

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
