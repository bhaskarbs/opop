package com.openopportunity.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "candidate_profiles")
public class CandidateProfile {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true, updatable = false)
    private UUID userId;

    @Column(nullable = false, length = 20)
    private String mobile;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> skills;

    @Column(name = "resume_file_name")
    private String resumeFileName;

    // Where FileStorageService actually put the uploaded bytes — null until a resume is
    // uploaded (resumeFileName may be set from registration before that happens).
    @Column(name = "resume_storage_key", length = 500)
    private String resumeStorageKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CandidateProfile() {
        // JPA
    }

    public CandidateProfile(UUID userId, String mobile, List<String> skills, String resumeFileName) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.mobile = mobile;
        this.skills = skills;
        this.resumeFileName = resumeFileName;
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

    public void updateResume(String resumeFileName, String resumeStorageKey) {
        this.resumeFileName = resumeFileName;
        this.resumeStorageKey = resumeStorageKey;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getMobile() {
        return mobile;
    }

    public List<String> getSkills() {
        return skills;
    }

    public String getResumeFileName() {
        return resumeFileName;
    }

    public String getResumeStorageKey() {
        return resumeStorageKey;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
