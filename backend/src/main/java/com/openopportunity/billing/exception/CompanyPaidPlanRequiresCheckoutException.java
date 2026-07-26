package com.openopportunity.billing.exception;

public class CompanyPaidPlanRequiresCheckoutException extends RuntimeException {

    public CompanyPaidPlanRequiresCheckoutException() {
        super("A paid plan requires checkout — use /api/company/billing/checkout instead");
    }
}
