package com.openopportunity.auth.dto;

import java.time.Instant;
import java.util.List;

/** email is deliberately not editable via CandidateProfileController — changing the address
 * tied to a login identity without re-verification is a separate, security-sensitive feature
 * this doesn't take on. */
public record CandidateProfileResponse(
        String fullName,
        String email,
        String mobile,
        boolean mobileVerified,
        String location,
        String title,
        List<String> skills,
        String resumeFileName,
        Instant resumeUploadedAt,
        Long resumeSizeBytes,
        String lifeGoals,
        String workCulture,
        String workModePreference,
        String openToPreference) {}
