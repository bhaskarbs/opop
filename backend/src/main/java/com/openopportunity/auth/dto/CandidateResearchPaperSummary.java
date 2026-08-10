package com.openopportunity.auth.dto;

import java.time.Instant;
import java.util.UUID;

public record CandidateResearchPaperSummary(
        UUID id, String title, String url, String description, Instant createdAt) {}
