package com.openopportunity.careerguide.dto;

import java.time.Instant;
import java.util.UUID;

public record CareerGuideStepSummary(
        UUID id, int stepOrder, String description, String videoUrl, Instant createdAt, Instant updatedAt) {}
