package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Fills in the verification details a Google-signup company starts without (see
 * AuthService.loginWithGoogleAsCompany) — the same fields CompanyRegisterPage collects
 * upfront for a password registration. entityType/pan/industry/address/signatoryName/
 * contactNumber/companyName are required together; cin+gstin are required unless entityType is
 * CompanyProfile.UNREGISTERED_ENTITY_TYPE, in which case aadhaarNumber is required instead —
 * see CompanyProfileService.requireValidProfileFields (mirrors AuthService's registration-time
 * check). There's no partial "save some now" state, since isProfileComplete() checks all of
 * them at once. */
public record UpdateCompanyProfileRequest(
        @NotBlank String companyName,
        @NotBlank String entityType,
        String cin,
        String gstin,
        String aadhaarNumber,
        @NotBlank String pan,
        @NotBlank String industry,
        @NotBlank String address,
        @NotBlank String signatoryName,
        @NotBlank @Pattern(regexp = "^\\d{10}$", message = "Enter a valid 10-digit contact number") String contactNumber) {}
