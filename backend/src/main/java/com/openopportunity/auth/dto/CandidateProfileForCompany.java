package com.openopportunity.auth.dto;

import com.openopportunity.job.ExperienceLevel;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A company's "View profile" of a candidate found via search — richer than
 * CandidateSearchSummary (adds experience level, industry, work preferences, photo, member
 * since, and resume metadata) but still excludes email/mobile, the same "no free contact info"
 * boundary CandidateSearchSummary draws (see CandidateSearchService.revealContact for how a
 * phone number actually gets granted). resumeFileName is null until the candidate has uploaded
 * one — the resume bytes themselves are fetched separately via
 * GET /api/company/candidates/{userId}/resume, gated the same way revealContact is. */
public record CandidateProfileForCompany(
        UUID userId,
        String fullName,
        String photoUrl,
        String title,
        String location,
        ExperienceLevel experienceLevel,
        String industry,
        List<String> skills,
        String workModePreference,
        String openToPreference,
        Instant memberSince,
        String resumeFileName,
        Instant resumeUploadedAt,
        Long resumeSizeBytes) {}
