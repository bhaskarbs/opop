package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaInterestRole;
import java.time.Instant;
import java.util.UUID;

/** contactNumber is the interested user's mobile, but only ever populated for the idea owner's
 * own view (see IdeaService.getInterests) and only when they're entitled to see it — a candidate
 * on the Plus (or higher) plan, per CandidateBillingService. Null both when the caller isn't
 * entitled and when the interested user has no mobile on file (e.g. they're a company, which
 * has no phone field — see CompanyProfile). */
public record IdeaInterestSummary(
        UUID id,
        String interestedUserName,
        IdeaInterestRole role,
        String ticketSize,
        String message,
        String contactNumber,
        Instant createdAt) {}
