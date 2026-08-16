package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Mirrors AdminGrantCandidatePlanRequest exactly — months/generateInvoice only matter for
 * plan=GROWTH (see CompanyBillingService.adminSetPlan). */
public record AdminGrantCompanyPlanRequest(
        @NotNull CompanySubscriptionPlan plan, @Min(1) @Max(24) Integer months, boolean generateInvoice) {}
