package com.openopportunity.auth.dto;

import com.openopportunity.auth.VerificationStatus;

public record CompanyProfileResponse(
        String companyName, String email, String entityType, String industry, VerificationStatus verificationStatus) {}
