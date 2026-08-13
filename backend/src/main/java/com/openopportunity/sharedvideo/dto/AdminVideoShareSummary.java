package com.openopportunity.sharedvideo.dto;

import java.time.Instant;
import java.util.UUID;

/** watchedPercent is null when the video's own durationSeconds is unknown (couldn't be read
 * client-side at upload time) — maxWatchedSeconds is still meaningful on its own then, just not
 * expressible as a percentage. */
public record AdminVideoShareSummary(
        UUID id,
        String recipientName,
        String recipientEmail,
        String shareUrl,
        int maxWatchedSeconds,
        Integer watchedPercent,
        int viewCount,
        Instant firstViewedAt,
        Instant lastViewedAt,
        Instant createdAt) {}
