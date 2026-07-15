package com.openopportunity.auth.dto;

import com.openopportunity.auth.VerificationStatus;

public record CompanyProfileResponse(
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
        // Derived from CompanyProfile.isProfileComplete() — true once entityType/cin/gstin/
        // pan/industry/address/signatoryName are all filled in. A Google-signup company starts
        // false; the frontend uses this (together with verificationStatus == VERIFIED) to gate
        // job posting and contacting candidates.
        boolean profileComplete) {}
