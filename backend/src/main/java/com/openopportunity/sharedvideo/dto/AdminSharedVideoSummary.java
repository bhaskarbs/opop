package com.openopportunity.sharedvideo.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminSharedVideoSummary(
        UUID id,
        String title,
        String contentType,
        long sizeBytes,
        Integer durationSeconds,
        int shareCount,
        Instant createdAt) {}
