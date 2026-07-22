package com.openopportunity.auth.exception;

public class InvalidOrExpiredVerificationTokenException extends RuntimeException {

    public InvalidOrExpiredVerificationTokenException() {
        super("This verification link is invalid or has expired. Request a new one.");
    }
}
