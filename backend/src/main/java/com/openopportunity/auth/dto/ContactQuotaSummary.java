package com.openopportunity.auth.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import java.time.Instant;

/** Backs the "N of M contacts remaining" indicator on SearchCandidatesPage/JobApplicantsPage —
 * see CandidateSearchService.getContactQuota. periodEnd is null on Free (or a company that's
 * never subscribed), since there's no active billing period to report. */
public record ContactQuotaSummary(
        CompanySubscriptionPlan plan, int limit, long used, long remaining, Instant periodEnd) {}
