package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Fills in the verification details a Google-signup company starts without (see
 * AuthService.loginWithGoogleAsCompany) — the same fields CompanyRegisterPage collects
 * upfront for a password registration. All fields are required together: there's no partial
 * "save some now" state, since isProfileComplete() checks all of them at once. */
public record UpdateCompanyProfileRequest(
        @NotBlank String entityType,
        @NotBlank String cin,
        @NotBlank String gstin,
        @NotBlank String pan,
        @NotBlank String industry,
        @NotBlank String address,
        @NotBlank String signatoryName) {}
