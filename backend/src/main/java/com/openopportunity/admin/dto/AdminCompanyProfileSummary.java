package com.openopportunity.admin.dto;

import com.openopportunity.auth.VerificationStatus;
import com.openopportunity.auth.dto.CompanyCertificateSummary;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminCompanyProfileSummary(
        UUID userId,
        String companyName,
        String email,
        String entityType,
        String cin,
        String gstin,
        // Only meaningful when entityType is CompanyProfile.UNREGISTERED_ENTITY_TYPE —
        // substitutes for cin/gstin as the identity check on a company that isn't formally
        // registered yet.
        String aadhaarNumber,
        String pan,
        String industry,
        String address,
        String signatoryName,
        String contactNumber,
        VerificationStatus verificationStatus,
        Instant submittedAt,
        // Verification documents on file — download via
        // GET /api/admin/companies/{userId}/certificates/{certificateId}.
        List<CompanyCertificateSummary> certificates) {}
