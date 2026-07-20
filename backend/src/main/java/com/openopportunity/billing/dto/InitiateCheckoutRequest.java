package com.openopportunity.billing.dto;

import com.openopportunity.billing.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;

public record InitiateCheckoutRequest(@NotNull SubscriptionPlan plan) {}
