package com.openopportunity.careerguide.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CareerGuideStepRequest(
        @NotBlank @Size(max = 300) String description, @NotBlank @Size(max = 2048) String videoUrl) {}
