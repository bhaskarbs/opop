package com.openopportunity.admin.dto;

import com.openopportunity.auth.AccountStatus;
import com.openopportunity.job.ExperienceLevel;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Full candidate detail for the admin Users page's "More details" link — unlike
 * CandidateProfileForCompany (what a company sees), an admin gets email/mobile directly since
 * there's no "reveal contact" boundary for platform staff. Every CandidateProfile field is
 * nullable here because a candidate can exist with no profile row filled in yet. */
public record AdminCandidateProfileSummary(
        UUID userId,
        String fullName,
        String email,
        AccountStatus accountStatus,
        String mobile,
        boolean mobileVerified,
        String location,
        String title,
        ExperienceLevel experienceLevel,
        String industry,
        List<String> skills,
        String resumeFileName,
        Instant resumeUploadedAt,
        Long resumeSizeBytes,
        String photoUrl,
        String lifeGoals,
        String workCulture,
        String workModePreference,
        String openToPreference,
        Instant createdAt) {}
