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
        List<String> locations,
        WorkMode workMode,
        ExperienceLevel experienceLevel,
        EmploymentType employmentType,
        BigDecimal salaryMinLakhs,
        BigDecimal salaryMaxLakhs,
        // Optional "N-M years of experience" range, distinct from experienceLevel's coarse
        // tier — see Job#updateExperienceYears. Either or both may be null ("not specified").
        Integer experienceYearsMin,
        Integer experienceYearsMax,
        List<String> skills,
        JobStatus status,
        int applicantCount,
        Instant createdAt,
        // Null unless the posting company has uploaded a logo (see
        // CompanyProfileService.uploadLogo) — derived dynamically from the job's companyId
        // rather than denormalized onto Job, so a later logo change/removal is reflected
        // immediately without needing to touch every existing job row.
        String companyLogoUrl,
        // Backs the "Promoted" / "Featured" badges on the job search results list — see
        // JobService#rankSearchResults for the ranking these also drive. isPromoted mirrors
        // CandidateSearchService's Plus-plan boost, one level up: it's the *posting company's*
        // plan (GROWTH/ENTERPRISE), not a per-job purchase.
        boolean isPromoted,
        boolean isFeatured) {}
