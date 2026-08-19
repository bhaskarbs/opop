package com.openopportunity.job.dto;

import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record JobRequest(
        @NotBlank String title,
        @NotNull EmploymentType employmentType,
        @NotNull ExperienceLevel experienceLevel,
        @NotNull WorkMode workMode,
        @NotBlank String location,
        BigDecimal salaryMinLakhs,
        BigDecimal salaryMaxLakhs,
        // Optional "N-M years of experience" range, distinct from experienceLevel's coarse
        // tier — see Job#updateExperienceYears.
        Integer experienceYearsMin,
        Integer experienceYearsMax,
        LocalDate applicationDeadline,
        @NotBlank String aboutRole,
        List<String> responsibilities,
        List<String> requirements,
        List<String> skills,
        @NotNull JobStatus status) {}
