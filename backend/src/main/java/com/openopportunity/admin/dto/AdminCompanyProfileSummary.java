package com.openopportunity.admin.dto;

import com.openopportunity.auth.VerificationStatus;
import java.time.Instant;
import java.util.UUID;

public record AdminCompanyProfileSummary(
        UUID userId,
        String companyName,
        String email,
        String entityType,
        String cin,
        String gstin,
        String pan,
        String industry,
        String address,
        String signatoryName,
        VerificationStatus verificationStatus,
        Instant submittedAt) {}
