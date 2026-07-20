package com.openopportunity.billing.exception;

public class SamePlanException extends RuntimeException {

    public SamePlanException() {
        super("You're already on this plan");
    }
}
