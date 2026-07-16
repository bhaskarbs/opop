package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaStage;
import com.openopportunity.idea.IdeaStatus;
import java.time.Instant;
import java.util.UUID;

public record IdeaDetail(
        UUID id,
        String submitterName,
        String title,
        String category,
        IdeaStage stage,
        String problem,
        String solution,
        String targetMarket,
        String funding,
        String equity,
        Integer teamSize,
        String timeline,
        String videoLink,
        String contactEmail,
        IdeaStatus status,
        Instant createdAt) {}
