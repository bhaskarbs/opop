package com.openopportunity.job.dto;

import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record JobDetail(
        UUID id,
        String title,
        String companyName,
        String location,
        WorkMode workMode,
        ExperienceLevel experienceLevel,
        EmploymentType employmentType,
        BigDecimal salaryMinLakhs,
        BigDecimal salaryMaxLakhs,
        LocalDate applicationDeadline,
        String aboutRole,
        List<String> responsibilities,
        List<String> requirements,
        List<String> skills,
        JobStatus status,
        int applicantCount,
        Instant createdAt) {}
