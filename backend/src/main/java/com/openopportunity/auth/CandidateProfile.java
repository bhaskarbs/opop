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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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

    // All five below are shown only on the candidate's own profile and the "add missing
    // details" checklist — deliberately NOT surfaced on CandidateProfileForCompany/
    // CandidateSearchSummary (what a company sees). Gender/marital status/date of birth are
    // classic vectors for hiring bias, so unlike the rest of the profile they're kept out of a
    // company's view entirely rather than gated behind a "reveal" action.
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "marital_status", length = 20)
    private MaritalStatus maritalStatus;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(columnDefinition = "text")
    private String address;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> languages = List.of();

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

    // Set by an admin to pin this candidate above the rest of a company's search results
    // (see AdminUserService#feature) — null means not featured. Kept as a timestamp rather than
    // a boolean so un-featuring and re-featuring later doesn't need a separate history table.
    @Column(name = "featured_at")
    private Instant featuredAt;

    // Backs the candidate dashboard's "search appearances" / "recruiter views" stats.
    // searchAppearanceCount is incremented once per candidate for every CandidateSearchService
    // .search() call that returns them in the results list (regardless of the searching
    // company's plan/eligibility, since the list itself is freely browsable); profileViewCount
    // is incremented once per CandidateSearchService.get() call, which — unlike search — is
    // already gated behind an eligible, paying company (see requireEligibleToContactCandidates).
    @Column(name = "search_appearance_count", nullable = false)
    private int searchAppearanceCount;

    @Column(name = "profile_view_count", nullable = false)
    private int profileViewCount;

    // Self-reported, distinct from experienceLevel's coarse 4-bucket enum — allows a specific
    // figure like "2.5" rather than forcing a candidate into ENTRY_LEVEL/MID_LEVEL/etc.
    @Column(name = "years_of_experience", precision = 4, scale = 1)
    private BigDecimal yearsOfExperience;

    // In lakhs, same unit as Job.salaryMinLakhs/salaryMaxLakhs (V4) so it's directly comparable
    // to a job's advertised range.
    @Column(name = "current_salary_lakhs", precision = 6, scale = 2)
    private BigDecimal currentSalaryLakhs;

    @Enumerated(EnumType.STRING)
    @Column(name = "notice_period", length = 20)
    private NoticePeriod noticePeriod;

    @Column(name = "education_degree", length = 255)
    private String educationDegree;

    @Column(name = "education_institution", length = 255)
    private String educationInstitution;

    @Column(name = "education_graduation_year")
    private Integer educationGraduationYear;

    // Set once, the first (and only) time ResumeReminderService emails this candidate about
    // still not having uploaded a resume — a one-shot nudge, not a recurring reminder.
    @Column(name = "resume_reminder_sent_at")
    private Instant resumeReminderSentAt;

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
            String location,
            String title,
            String mobile,
            ExperienceLevel experienceLevel,
            String industry,
            Gender gender,
            MaritalStatus maritalStatus,
            LocalDate dateOfBirth,
            String address,
            List<String> languages) {
        this.location = location;
        this.title = title;
        this.mobile = mobile;
        this.experienceLevel = experienceLevel;
        this.industry = industry;
        this.gender = gender;
        this.maritalStatus = maritalStatus;
        this.dateOfBirth = dateOfBirth;
        this.address = address;
        this.languages = languages;
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

    public void updateBackground(
            BigDecimal yearsOfExperience,
            BigDecimal currentSalaryLakhs,
            NoticePeriod noticePeriod,
            String educationDegree,
            String educationInstitution,
            Integer educationGraduationYear) {
        this.yearsOfExperience = yearsOfExperience;
        this.currentSalaryLakhs = currentSalaryLakhs;
        this.noticePeriod = noticePeriod;
        this.educationDegree = educationDegree;
        this.educationInstitution = educationInstitution;
        this.educationGraduationYear = educationGraduationYear;
    }

    public void feature() {
        this.featuredAt = Instant.now();
    }

    public void unfeature() {
        this.featuredAt = null;
    }

    public void recordSearchAppearance() {
        this.searchAppearanceCount++;
    }

    public void recordProfileView() {
        this.profileViewCount++;
    }

    public void markResumeReminderSent(Instant at) {
        this.resumeReminderSentAt = at;
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

    public Gender getGender() {
        return gender;
    }

    public MaritalStatus getMaritalStatus() {
        return maritalStatus;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public String getAddress() {
        return address;
    }

    public List<String> getLanguages() {
        return languages;
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

    public Instant getFeaturedAt() {
        return featuredAt;
    }

    public int getSearchAppearanceCount() {
        return searchAppearanceCount;
    }

    public int getProfileViewCount() {
        return profileViewCount;
    }

    public BigDecimal getYearsOfExperience() {
        return yearsOfExperience;
    }

    public BigDecimal getCurrentSalaryLakhs() {
        return currentSalaryLakhs;
    }

    public NoticePeriod getNoticePeriod() {
        return noticePeriod;
    }

    public String getEducationDegree() {
        return educationDegree;
    }

    public String getEducationInstitution() {
        return educationInstitution;
    }

    public Integer getEducationGraduationYear() {
        return educationGraduationYear;
    }

    public Instant getResumeReminderSentAt() {
        return resumeReminderSentAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
