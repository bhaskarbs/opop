package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record AddResearchPaperRequest(@NotBlank String title, @NotBlank String url, String description) {}
