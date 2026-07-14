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

    @Column(name = "resume_uploaded_at")
    private Instant resumeUploadedAt;

    @Column(name = "resume_size_bytes")
    private Long resumeSizeBytes;

    // Filled in from the candidate profile page, not registration — nullable since neither
    // is collected up front (see RegisterPage).
    @Column(length = 255)
    private String location;

    @Column(length = 255)
    private String title;

    @Column(name = "life_goals", columnDefinition = "text")
    private String lifeGoals;

    @Column(name = "work_culture", columnDefinition = "text")
    private String workCulture;

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

    public void updateResume(
            String resumeFileName, String resumeStorageKey, long resumeSizeBytes, Instant resumeUploadedAt) {
        this.resumeFileName = resumeFileName;
        this.resumeStorageKey = resumeStorageKey;
        this.resumeSizeBytes = resumeSizeBytes;
        this.resumeUploadedAt = resumeUploadedAt;
    }

    public void updatePersonalDetails(String location, String title, String mobile) {
        this.location = location;
        this.title = title;
        this.mobile = mobile;
    }

    public void updateSkills(List<String> skills) {
        this.skills = skills;
    }

    public void updateGoals(String lifeGoals, String workCulture) {
        this.lifeGoals = lifeGoals;
        this.workCulture = workCulture;
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

    public Instant getResumeUploadedAt() {
        return resumeUploadedAt;
    }

    public Long getResumeSizeBytes() {
        return resumeSizeBytes;
    }

    public String getLocation() {
        return location;
    }

    public String getTitle() {
        return title;
    }

    public String getLifeGoals() {
        return lifeGoals;
    }

    public String getWorkCulture() {
        return workCulture;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
