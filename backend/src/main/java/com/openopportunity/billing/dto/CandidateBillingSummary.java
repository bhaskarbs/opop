package com.openopportunity.billing.dto;

import com.openopportunity.billing.SubscriptionPlan;
import java.util.List;

public record CandidateBillingSummary(SubscriptionPlan currentPlan, List<BillingTransactionSummary> history) {}
