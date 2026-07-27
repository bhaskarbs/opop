package com.openopportunity.auth.dto;

import com.openopportunity.auth.VerificationStatus;

public record CompanyProfileResponse(
        String companyName,
        String email,
        String entityType,
        String cin,
        String gstin,
        String aadhaarNumber,
        String pan,
        String industry,
        String address,
        String signatoryName,
        String contactNumber,
        VerificationStatus verificationStatus,
        // Derived from CompanyProfile.isProfileComplete() — true once entityType/cin/gstin/
        // pan/industry/address/signatoryName are all filled in. A Google-signup company starts
        // false; the frontend uses this (together with verificationStatus == VERIFIED) to gate
        // job posting and contacting candidates.
        boolean profileComplete,
        // Null until the company uploads a logo (see CompanyProfileService.uploadLogo) — same
        // lazy-fill pattern as CandidateProfileResponse.photoUrl.
        String logoUrl) {}
