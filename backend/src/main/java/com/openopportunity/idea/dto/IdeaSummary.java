package com.openopportunity.idea.dto;

import com.openopportunity.auth.UserRole;
import com.openopportunity.idea.IdeaStage;
import com.openopportunity.idea.IdeaStatus;
import java.time.Instant;
import java.util.UUID;

public record IdeaSummary(
        UUID id,
        String title,
        String category,
        IdeaStage stage,
        String problem,
        String submitterName,
        UserRole submitterRole,
        String funding,
        Integer teamSize,
        String timeline,
        IdeaStatus status,
        Instant createdAt) {}
