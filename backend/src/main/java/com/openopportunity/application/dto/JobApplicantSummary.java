package com.openopportunity.application.dto;

import com.openopportunity.application.ApplicationStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Backs the "view applicants" page a company reaches from company/job-postings — richer than
 * ApplicationSummary (which is candidate-facing and has no candidate identity in it at all),
 * since a company needs to see who applied, not just track its own application status. Mirrors
 * CandidateSearchSummary's shape/eligibility-gated contactNumber (see
 * CandidateSearchService.revealContact) so the same reveal-contact UI can be reused here. */
public record JobApplicantSummary(
        UUID applicationId,
        UUID candidateUserId,
        String fullName,
        String title,
        String location,
        List<String> skills,
        ApplicationStatus status,
        Instant appliedAt,
        String contactNumber) {}
