package com.openopportunity.sharedvideo.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateVideoShareRequest(
        @NotBlank String recipientName, @NotBlank @Email String recipientEmail) {}
