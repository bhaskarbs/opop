package com.openopportunity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** role picks which account to look up — email is unique per role (see User), not globally.
 * One of "candidate", "company", "admin". */
public record ForgotPasswordRequest(@NotBlank @Email String email, @NotBlank String role) {}
