package com.openopportunity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** entityType/cin/gstin/pan/industry/address/signatoryName only apply to company
 * registrations — AuthService validates their presence itself (see registerCompany docs)
 * rather than via bean validation, since the requirement is conditional on role. */
public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank String fullName,
        @NotBlank String role,
        String entityType,
        String cin,
        String gstin,
        String pan,
        String industry,
        String address,
        String signatoryName) {

    /** Convenience constructor for candidate registrations, which never need the company fields. */
    public RegisterRequest(String email, String password, String fullName, String role) {
        this(email, password, fullName, role, null, null, null, null, null, null, null);
    }
}
