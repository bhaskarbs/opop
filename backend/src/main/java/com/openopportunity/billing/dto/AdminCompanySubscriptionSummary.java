package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import java.time.Instant;
import java.util.UUID;

/** A company's current plan as shown on the admin billing page. Mirrors
 * AdminCandidateSubscriptionSummary exactly — validUntil is null for Free (or a company that
 * has never subscribed) and the current paid period's end otherwise. */
public record AdminCompanySubscriptionSummary(
        UUID companyId, String companyName, String email, CompanySubscriptionPlan plan, Instant validUntil) {}
