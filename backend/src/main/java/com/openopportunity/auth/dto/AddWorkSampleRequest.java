package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record AddWorkSampleRequest(@NotBlank String title, @NotBlank String url, String description) {}
