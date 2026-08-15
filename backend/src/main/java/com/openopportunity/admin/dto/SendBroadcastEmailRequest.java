package com.openopportunity.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record SendBroadcastEmailRequest(
        @NotBlank @Size(max = 200) String subject,
        @NotEmpty List<String> recipients,
        @NotBlank @Size(max = 20_000) String message) {}
