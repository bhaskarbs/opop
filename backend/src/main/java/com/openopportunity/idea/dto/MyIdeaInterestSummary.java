package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaInterestRole;
import java.time.Instant;
import java.util.UUID;

public record MyIdeaInterestSummary(
        UUID id,
        UUID ideaId,
        String ideaTitle,
        String ideaSubmitterName,
        IdeaInterestRole role,
        String ticketSize,
        String message,
        Instant createdAt) {}
