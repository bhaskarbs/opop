package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record CompanyInitiateCheckoutRequest(@NotNull CompanySubscriptionPlan plan) {}
