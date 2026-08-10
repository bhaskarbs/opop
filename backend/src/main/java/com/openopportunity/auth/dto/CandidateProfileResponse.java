package com.openopportunity.auth.dto;

import com.openopportunity.auth.Gender;
import com.openopportunity.auth.MaritalStatus;
import com.openopportunity.auth.NoticePeriod;
import com.openopportunity.job.ExperienceLevel;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** email is deliberately not editable via CandidateProfileController — changing the address
 * tied to a login identity without re-verification is a separate, security-sensitive feature
 * this doesn't take on. gender/maritalStatus/dateOfBirth/address/languages are only ever
 * returned here (the candidate's own view) — deliberately absent from CandidateProfileForCompany
 * and CandidateSearchSummary, see CandidateProfile's field comment for why. */
public record CandidateProfileResponse(
        String fullName,
        String email,
        String mobile,
        boolean mobileVerified,
        String location,
        String title,
        ExperienceLevel experienceLevel,
        String industry,
        Gender gender,
        MaritalStatus maritalStatus,
        LocalDate dateOfBirth,
        String address,
        List<String> languages,
        List<String> skills,
        String resumeFileName,
        Instant resumeUploadedAt,
        Long resumeSizeBytes,
        // Relative path (see PhotoUploadResponse) — null until a photo is uploaded.
        String photoUrl,
        String lifeGoals,
        String workCulture,
        String workModePreference,
        String openToPreference,
        BigDecimal yearsOfExperience,
        BigDecimal currentSalaryLakhs,
        NoticePeriod noticePeriod,
        String educationDegree,
        String educationInstitution,
        Integer educationGraduationYear,
        // Dashboard visibility stats — see CandidateSearchService.search()/get() for where these
        // actually increment.
        int searchAppearanceCount,
        int profileViewCount,
        Instant createdAt) {}
