package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record CompanyChangePlanRequest(@NotNull CompanySubscriptionPlan plan) {}
