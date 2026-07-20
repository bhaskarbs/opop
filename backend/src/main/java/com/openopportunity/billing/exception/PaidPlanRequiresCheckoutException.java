package com.openopportunity.billing.exception;

public class PaidPlanRequiresCheckoutException extends RuntimeException {

    public PaidPlanRequiresCheckoutException() {
        super("A paid plan requires checkout — use /api/candidate/billing/checkout instead");
    }
}
