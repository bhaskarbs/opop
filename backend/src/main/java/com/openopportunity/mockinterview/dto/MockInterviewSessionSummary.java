package com.openopportunity.mockinterview.dto;

import java.time.Instant;
import java.util.UUID;

public record MockInterviewSessionSummary(
        UUID id, int questionCount, int durationSeconds, boolean hasThumbnail, Instant recordedAt) {}
