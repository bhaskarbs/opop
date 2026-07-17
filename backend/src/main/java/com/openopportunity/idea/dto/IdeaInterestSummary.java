package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaInterestRole;
import java.time.Instant;
import java.util.UUID;

public record IdeaInterestSummary(
        UUID id,
        String interestedUserName,
        IdeaInterestRole role,
        String ticketSize,
        String message,
        Instant createdAt) {}
