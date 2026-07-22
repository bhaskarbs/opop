package com.openopportunity.auth;

import com.openopportunity.job.ExperienceLevel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    // Where FileStorageService put the uploaded photo bytes, and its content type (needed to
    // set the right Content-Type header when CandidatePhotoController serves it back) — both
    // null until a photo is uploaded.
    @Column(name = "photo_storage_key", length = 500)
    private String photoStorageKey;

    @Column(name = "photo_content_type", length = 100)
    private String photoContentType;

    // Filled in from the candidate profile page, not registration — nullable since neither
    // is collected up front (see RegisterPage).
    @Column(length = 255)
    private String location;

    @Column(length = 255)
    private String title;

    // Reuses jobs' own ExperienceLevel enum (see V4/V22) so a candidate's self-reported level
    // lines up with the levels job search filters by; industry stays free text, matching how
    // company registration free-texts a company's industry.
    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", length = 20)
    private ExperienceLevel experienceLevel;

    @Column(length = 255)
    private String industry;

    @Column(name = "life_goals", columnDefinition = "text")
    private String lifeGoals;

    @Column(name = "work_culture", columnDefinition = "text")
    private String workCulture;

    // There's no real OTP/SMS provider wired up — this just tracks whether the candidate went
    // through AddMissingDetailsPage's (currently cosmetic) verify flow, not a confirmed number.
    @Column(name = "mobile_verified", nullable = false)
    private boolean mobileVerified;

    @Column(name = "work_mode_preference", length = 50)
    private String workModePreference;

    @Column(name = "open_to_preference", length = 100)
    private String openToPreference;

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

    public void updatePersonalDetails(
            String location, String title, String mobile, ExperienceLevel experienceLevel, String industry) {
        this.location = location;
        this.title = title;
        this.mobile = mobile;
        this.experienceLevel = experienceLevel;
        this.industry = industry;
    }

    public void updateSkills(List<String> skills) {
        this.skills = skills;
    }

    public void updateGoals(String lifeGoals, String workCulture) {
        this.lifeGoals = lifeGoals;
        this.workCulture = workCulture;
    }

    public void verifyMobile(String mobile) {
        this.mobile = mobile;
        this.mobileVerified = true;
    }

    public void updatePreferences(String workModePreference, String openToPreference) {
        this.workModePreference = workModePreference;
        this.openToPreference = openToPreference;
    }

    public void updatePhoto(String photoStorageKey, String photoContentType) {
        this.photoStorageKey = photoStorageKey;
        this.photoContentType = photoContentType;
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

    public String getPhotoStorageKey() {
        return photoStorageKey;
    }

    public String getPhotoContentType() {
        return photoContentType;
    }

    public String getLocation() {
        return location;
    }

    public String getTitle() {
        return title;
    }

    public ExperienceLevel getExperienceLevel() {
        return experienceLevel;
    }

    public String getIndustry() {
        return industry;
    }

    public String getLifeGoals() {
        return lifeGoals;
    }

    public String getWorkCulture() {
        return workCulture;
    }

    public boolean isMobileVerified() {
        return mobileVerified;
    }

    public String getWorkModePreference() {
        return workModePreference;
    }

    public String getOpenToPreference() {
        return openToPreference;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
