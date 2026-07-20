package com.openopportunity.billing.dto;

import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.billing.TransactionStatus;
import java.time.Instant;
import java.util.UUID;

public record BillingTransactionSummary(
        UUID id, SubscriptionPlan plan, int amountRupees, TransactionStatus status, Instant createdAt) {}
