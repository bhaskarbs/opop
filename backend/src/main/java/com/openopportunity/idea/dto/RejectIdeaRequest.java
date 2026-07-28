package com.openopportunity.idea.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectIdeaRequest(@NotBlank String reason) {}
