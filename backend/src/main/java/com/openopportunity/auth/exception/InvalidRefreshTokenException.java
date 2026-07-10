package com.openopportunity.auth.exception;

public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("Refresh token is missing, expired, or has been revoked");
    }
}
