package com.openopportunity.mockinterview.dto;

import java.time.Instant;
import java.util.UUID;

public record MockInterviewSessionSummary(
        UUID id,
        int questionCount,
        int durationSeconds,
        boolean hasThumbnail,
        Instant recordedAt,
        // Reused as-is for the company-facing embedded list on CandidateProfileForCompany (see
        // CandidateSearchService#get) — always true there, since only visible sessions are ever
        // returned to a company in the first place.
        boolean visibleToCompanies) {}
