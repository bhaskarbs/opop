package com.openopportunity.mockinterview.dto;

import java.time.Instant;
import java.util.UUID;

public record MockInterviewSessionSummary(
        UUID id, String category, int questionCount, int durationSeconds, Instant recordedAt) {}
