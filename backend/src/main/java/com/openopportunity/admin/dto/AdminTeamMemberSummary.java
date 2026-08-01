package com.openopportunity.admin.dto;

import com.openopportunity.auth.AdminLevel;
import java.time.Instant;
import java.util.UUID;

public record AdminTeamMemberSummary(
        UUID id, String email, String fullName, AdminLevel adminLevel, Instant createdAt) {}
