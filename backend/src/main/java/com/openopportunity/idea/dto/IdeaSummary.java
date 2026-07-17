package com.openopportunity.idea.dto;

import com.openopportunity.auth.UserRole;
import com.openopportunity.idea.IdeaStage;
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
        Instant createdAt) {}
