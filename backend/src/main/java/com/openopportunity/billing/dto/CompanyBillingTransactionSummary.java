package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.TransactionStatus;
import java.time.Instant;
import java.util.UUID;

public record CompanyBillingTransactionSummary(
        UUID id, CompanySubscriptionPlan plan, int amountRupees, TransactionStatus status, Instant createdAt) {}
