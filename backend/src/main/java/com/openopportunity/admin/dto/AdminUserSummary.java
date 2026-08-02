package com.openopportunity.admin.dto;

import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
import java.time.Instant;
import java.util.UUID;

/** verificationStatus/industry/cin are only meaningful for role=COMPANY, featuredAt only for
 * role=CANDIDATE — null otherwise. */
public record AdminUserSummary(
        UUID id,
        String email,
        String fullName,
        UserRole role,
        AccountStatus accountStatus,
        VerificationStatus verificationStatus,
        String industry,
        String cin,
        Instant featuredAt,
        Instant createdAt) {}
