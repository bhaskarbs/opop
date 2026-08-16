package com.openopportunity.billing.dto;

import com.openopportunity.billing.SubscriptionPlan;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** months/generateInvoice only matter for plan=PLUS — a FREE downgrade ignores both (see
 * CandidateBillingService.adminSetPlan). Bean validation lets months be null (only @NotNull
 * fields reject null); the plan=PLUS-requires-months check happens in the service instead,
 * since it depends on another field. */
public record AdminGrantCandidatePlanRequest(
        @NotNull SubscriptionPlan plan, @Min(1) @Max(24) Integer months, boolean generateInvoice) {}
