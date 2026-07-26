package com.openopportunity.billing.dto;

import com.openopportunity.billing.CompanySubscriptionPlan;
import java.util.UUID;

/** razorpayKeyId is the publishable key (safe to send to the browser) — the frontend passes it
 * straight into the Razorpay Checkout options alongside razorpayOrderId. */
public record CompanyCheckoutSummary(
        UUID transactionId,
        String razorpayOrderId,
        String razorpayKeyId,
        int amountRupees,
        CompanySubscriptionPlan plan) {}
