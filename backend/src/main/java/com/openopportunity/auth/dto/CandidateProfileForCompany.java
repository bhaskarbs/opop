package com.openopportunity.auth.dto;

import com.openopportunity.job.ExperienceLevel;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A company's "View profile" of a candidate found via search — richer than
 * CandidateSearchSummary (adds experience level, industry, work preferences, photo, member
 * since) but still excludes email/mobile/resume, the same "no free contact info" boundary
 * CandidateSearchSummary already draws. A company only ever gets a phone number once granted
 * contact access elsewhere (see the candidate-billing Plus-plan gate on idea-applicant contact
 * numbers for the same pattern) — there's no equivalent grant for search yet, so this stays
 * contact-free. */
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
        Instant memberSince) {}
