package com.openopportunity.application.dto;

import com.openopportunity.application.ApplicationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateApplicationStatusRequest(@NotNull ApplicationStatus status) {}
