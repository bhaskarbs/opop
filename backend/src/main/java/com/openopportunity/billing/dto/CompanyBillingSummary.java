package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import java.time.Instant;
import java.util.List;

public record CompanyBillingSummary(
        CompanySubscriptionPlan currentPlan,
        Instant currentPlanValidUntil,
        List<CompanyBillingTransactionSummary> history) {}
