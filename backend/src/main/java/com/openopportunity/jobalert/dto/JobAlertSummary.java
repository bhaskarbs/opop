package com.openopportunity.jobalert.dto;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.WorkMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record JobAlertSummary(
        UUID id,
        List<String> keywords,
        List<String> locations,
        ExperienceLevel experienceLevel,
        WorkMode workMode,
        Instant createdAt) {}
