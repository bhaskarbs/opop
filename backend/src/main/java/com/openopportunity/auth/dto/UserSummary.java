package com.openopportunity.auth.dto;

import com.openopportunity.auth.UserRole;
import java.util.UUID;

public record UserSummary(UUID id, String email, String fullName, UserRole role) {}
