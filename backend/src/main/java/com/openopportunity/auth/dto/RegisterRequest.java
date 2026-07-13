package com.openopportunity.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** entityType/cin/gstin/pan/industry/address/signatoryName only apply to company
 * registrations, and mobile/skills/resumeFileName only apply to candidate registrations —
 * AuthService validates their presence itself (see requireCompanyProfileFields /
 * requireCandidateProfileFields) rather than via bean validation, since the requirement is
 * conditional on role. */
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
        String signatoryName,
        String mobile,
        List<String> skills,
        String resumeFileName) {

    /** Convenience constructor for company registrations, which never need the candidate fields. */
    public RegisterRequest(
            String email,
            String password,
            String fullName,
            String role,
            String entityType,
            String cin,
            String gstin,
            String pan,
            String industry,
            String address,
            String signatoryName) {
        this(
                email,
                password,
                fullName,
                role,
                entityType,
                cin,
                gstin,
                pan,
                industry,
                address,
                signatoryName,
                null,
                null,
                null);
    }

    /** Convenience constructor for tests/callers that need neither company nor candidate fields. */
    public RegisterRequest(String email, String password, String fullName, String role) {
        this(email, password, fullName, role, null, null, null, null, null, null, null, null, null, null);
    }

    /** Convenience constructor for candidate registrations, which never need the company fields. */
    public RegisterRequest(
            String email, String password, String fullName, String role, String mobile, List<String> skills) {
        this(email, password, fullName, role, null, null, null, null, null, null, null, mobile, skills, null);
    }
}
