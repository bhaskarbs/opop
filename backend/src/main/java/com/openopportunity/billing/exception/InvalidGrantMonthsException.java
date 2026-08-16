package com.openopportunity.billing.exception;

public class InvalidGrantMonthsException extends RuntimeException {

    public InvalidGrantMonthsException() {
        super("months is required (1-24) when granting the Plus plan");
    }
}
