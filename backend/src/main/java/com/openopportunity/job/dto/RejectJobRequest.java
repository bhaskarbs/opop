package com.openopportunity.job.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectJobRequest(@NotBlank String reason) {}
