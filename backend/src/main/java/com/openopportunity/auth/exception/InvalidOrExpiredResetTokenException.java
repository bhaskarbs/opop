package com.openopportunity.auth.exception;

public class InvalidOrExpiredResetTokenException extends RuntimeException {

    public InvalidOrExpiredResetTokenException() {
        super("This password reset link is invalid or has expired. Request a new one.");
    }
}
