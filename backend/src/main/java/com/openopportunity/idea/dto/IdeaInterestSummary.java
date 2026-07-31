package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaInterestRole;
import java.time.Instant;
import java.util.UUID;

/** contactNumber and candidateUserId are only ever populated for the idea owner's own view (see
 * IdeaService.getInterests) and only when they're entitled to see them — a candidate on the Plus
 * (or higher) plan, or an admin-verified company on the Growth (or higher) plan, per
 * CandidateBillingService / CompanyBillingService + CompanyProfile.isVerified respectively. Both
 * stay null when the caller isn't entitled; contactNumber is also null when the interested user
 * has no mobile on file (e.g. they're a company, which has no phone field — see CompanyProfile),
 * and candidateUserId is null when the interested user isn't a candidate (so has no viewable
 * profile — see CandidateProfileForCompany). */
public record IdeaInterestSummary(
        UUID id,
        String interestedUserName,
        IdeaInterestRole role,
        String ticketSize,
        String message,
        String contactNumber,
        UUID candidateUserId,
        Instant createdAt) {}
