package com.openopportunity.job;

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
@Table(name = "jobs")
public class Job {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private UUID companyId;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", nullable = false, length = 20)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "experience_level", nullable = false, length = 20)
    private ExperienceLevel experienceLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "work_mode", nullable = false, length = 20)
    private WorkMode workMode;

    @Column(nullable = false)
    private String location;

    @Column(name = "salary_min_lakhs", precision = 6, scale = 2)
    private BigDecimal salaryMinLakhs;

    @Column(name = "salary_max_lakhs", precision = 6, scale = 2)
    private BigDecimal salaryMaxLakhs;

    @Column(name = "application_deadline")
    private LocalDate applicationDeadline;

    @Column(name = "about_role", nullable = false, columnDefinition = "text")
    private String aboutRole;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> responsibilities;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> requirements;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(nullable = false, columnDefinition = "text[]")
    private List<String> skills;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobStatus status;

    @Column(name = "applicant_count", nullable = false)
    private int applicantCount;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Job() {
        // JPA
    }

    public Job(
            UUID companyId,
            String companyName,
            String title,
            EmploymentType employmentType,
            ExperienceLevel experienceLevel,
            WorkMode workMode,
            String location,
            BigDecimal salaryMinLakhs,
            BigDecimal salaryMaxLakhs,
            LocalDate applicationDeadline,
            String aboutRole,
            List<String> responsibilities,
            List<String> requirements,
            List<String> skills,
            JobStatus status) {
        this.id = UUID.randomUUID();
        this.companyId = companyId;
        this.companyName = companyName;
        this.title = title;
        this.employmentType = employmentType;
        this.experienceLevel = experienceLevel;
        this.workMode = workMode;
        this.location = location;
        this.salaryMinLakhs = salaryMinLakhs;
        this.salaryMaxLakhs = salaryMaxLakhs;
        this.applicationDeadline = applicationDeadline;
        this.aboutRole = aboutRole;
        this.responsibilities = responsibilities;
        this.requirements = requirements;
        this.skills = skills;
        this.status = status;
        this.applicantCount = 0;
    }

    public void update(
            String title,
            EmploymentType employmentType,
            ExperienceLevel experienceLevel,
            WorkMode workMode,
            String location,
            BigDecimal salaryMinLakhs,
            BigDecimal salaryMaxLakhs,
            LocalDate applicationDeadline,
            String aboutRole,
            List<String> responsibilities,
            List<String> requirements,
            List<String> skills,
            JobStatus status) {
        this.title = title;
        this.employmentType = employmentType;
        this.experienceLevel = experienceLevel;
        this.workMode = workMode;
        this.location = location;
        this.salaryMinLakhs = salaryMinLakhs;
        this.salaryMaxLakhs = salaryMaxLakhs;
        this.applicationDeadline = applicationDeadline;
        this.aboutRole = aboutRole;
        this.responsibilities = responsibilities;
        this.requirements = requirements;
        this.skills = skills;
        this.status = status;
    }

    public void approve() {
        this.status = JobStatus.ACTIVE;
    }

    public void reject() {
        this.status = JobStatus.REJECTED;
    }

    public void incrementApplicantCount() {
        this.applicantCount++;
    }

    public void decrementApplicantCount() {
        if (this.applicantCount > 0) {
            this.applicantCount--;
        }
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

    public UUID getId() {
        return id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getTitle() {
        return title;
    }

    public EmploymentType getEmploymentType() {
        return employmentType;
    }

    public ExperienceLevel getExperienceLevel() {
        return experienceLevel;
    }

    public WorkMode getWorkMode() {
        return workMode;
    }

    public String getLocation() {
        return location;
    }

    public BigDecimal getSalaryMinLakhs() {
        return salaryMinLakhs;
    }

    public BigDecimal getSalaryMaxLakhs() {
        return salaryMaxLakhs;
    }

    public LocalDate getApplicationDeadline() {
        return applicationDeadline;
    }

    public String getAboutRole() {
        return aboutRole;
    }

    public List<String> getResponsibilities() {
        return responsibilities;
    }

    public List<String> getRequirements() {
        return requirements;
    }

    public List<String> getSkills() {
        return skills;
    }

    public JobStatus getStatus() {
        return status;
    }

    public int getApplicantCount() {
        return applicantCount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
