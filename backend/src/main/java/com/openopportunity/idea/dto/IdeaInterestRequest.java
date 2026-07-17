package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaInterestRole;
import jakarta.validation.constraints.NotNull;

public record IdeaInterestRequest(@NotNull IdeaInterestRole role, String ticketSize, String message) {}
