package com.openopportunity.auth.exception;

public class InvalidGoogleTokenException extends RuntimeException {

    public InvalidGoogleTokenException() {
        super("Google sign-in failed — the token could not be verified");
    }
}
