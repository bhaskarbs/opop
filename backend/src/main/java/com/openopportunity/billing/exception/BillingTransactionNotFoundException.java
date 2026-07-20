package com.openopportunity.billing.exception;

import java.util.UUID;

public class BillingTransactionNotFoundException extends RuntimeException {

    public BillingTransactionNotFoundException(UUID id) {
        super("Billing transaction not found: " + id);
    }
}
