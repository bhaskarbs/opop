package com.openopportunity.admin.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectCompanyRequest(@NotBlank String reason) {}
