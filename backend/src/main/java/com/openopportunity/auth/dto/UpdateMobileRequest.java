package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** No real OTP/SMS provider exists — this just persists the number and marks it verified,
 * matching AddMissingDetailsPage's (currently cosmetic) "Verify & save" action. */
public record UpdateMobileRequest(@NotBlank String mobile) {}
