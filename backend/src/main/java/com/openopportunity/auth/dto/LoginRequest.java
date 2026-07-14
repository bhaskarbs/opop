package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** role picks which account to look up — email is unique per role (see User), not globally, so
 * an email alone is ambiguous once the same address has both e.g. a candidate and a company
 * account. One of "candidate", "company", "admin". */
public record LoginRequest(@NotBlank String email, @NotBlank String password, @NotBlank String role) {}
