package com.openopportunity.auth.dto;

import com.openopportunity.auth.AdminLevel;
import com.openopportunity.auth.UserRole;
import java.util.UUID;

// adminLevel is null for candidates/companies — only meaningful when role == ADMIN.
public record UserSummary(UUID id, String email, String fullName, UserRole role, AdminLevel adminLevel) {}
