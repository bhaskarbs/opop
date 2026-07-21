package com.openopportunity.billing.dto;

import com.openopportunity.billing.SubscriptionPlan;
import java.time.Instant;
import java.util.List;

public record CandidateBillingSummary(
        SubscriptionPlan currentPlan, Instant currentPlanValidUntil, List<BillingTransactionSummary> history) {}
