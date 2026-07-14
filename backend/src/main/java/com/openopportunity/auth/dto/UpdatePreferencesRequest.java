package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdatePreferencesRequest(@NotBlank String workMode, @NotBlank String openTo) {}
