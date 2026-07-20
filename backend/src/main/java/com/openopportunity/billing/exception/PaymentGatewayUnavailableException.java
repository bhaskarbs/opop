package com.openopportunity.billing.exception;

public class PaymentGatewayUnavailableException extends RuntimeException {

    public PaymentGatewayUnavailableException() {
        super("Payment is temporarily unavailable. Please try again shortly.");
    }
}
