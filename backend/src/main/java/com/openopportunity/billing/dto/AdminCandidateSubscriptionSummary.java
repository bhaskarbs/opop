package com.openopportunity.billing.dto;

import com.openopportunity.billing.SubscriptionPlan;
import java.time.Instant;
import java.util.UUID;

/** A candidate's current plan as shown on the admin billing page. validUntil is null for Free
 * (or a candidate who has never subscribed) and the ~30-day period end for a paid plan. */
public record AdminCandidateSubscriptionSummary(
        UUID candidateId, String fullName, String email, SubscriptionPlan plan, Instant validUntil) {}
