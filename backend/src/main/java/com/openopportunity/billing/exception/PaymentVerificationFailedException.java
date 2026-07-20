package com.openopportunity.billing.exception;

public class PaymentVerificationFailedException extends RuntimeException {

    public PaymentVerificationFailedException() {
        super("Payment could not be verified");
    }
}
