package com.openopportunity.auth.dto;

import java.time.Instant;
import java.util.UUID;

/** logoUrl is null until a logo has been uploaded — relative path (see CandidateCertificationLogoController),
 * prefix with API_BASE_URL for an &lt;img src&gt;, same convention as CandidateProfileResponse.photoUrl. */
public record CandidateCertificationSummary(
        UUID id,
        String name,
        String certificationId,
        String certificationUrl,
        String logoUrl,
        Instant createdAt) {}
