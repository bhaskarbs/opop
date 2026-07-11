package com.openopportunity.admin.dto;

import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
import java.time.Instant;
import java.util.UUID;

/** verificationStatus is only meaningful for role=COMPANY — null for candidates and admins. */
public record AdminUserSummary(
        UUID id,
        String email,
        String fullName,
        UserRole role,
        AccountStatus accountStatus,
        VerificationStatus verificationStatus,
        Instant createdAt) {}
