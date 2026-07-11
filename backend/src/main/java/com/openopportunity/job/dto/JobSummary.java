package com.openopportunity.job.dto;

import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Shape used for both search results and a company's own postings list — presentation
 * concerns (initials, avatar colors, "posted N days ago" labels) are left to the frontend. */
public record JobSummary(
        UUID id,
        String title,
        String companyName,
        String location,
        WorkMode workMode,
        ExperienceLevel experienceLevel,
        EmploymentType employmentType,
        BigDecimal salaryMinLakhs,
        BigDecimal salaryMaxLakhs,
        List<String> skills,
        JobStatus status,
        int applicantCount,
        Instant createdAt) {}
