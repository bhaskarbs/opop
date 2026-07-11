package com.openopportunity.application.dto;

import com.openopportunity.application.ApplicationStatus;
import java.time.Instant;
import java.util.UUID;

public record ApplicationSummary(
        UUID id,
        UUID jobId,
        String jobTitle,
        String companyName,
        ApplicationStatus status,
        Instant appliedAt) {}
