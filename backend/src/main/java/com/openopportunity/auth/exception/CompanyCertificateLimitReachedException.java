package com.openopportunity.auth.exception;

public class CompanyCertificateLimitReachedException extends RuntimeException {

    public CompanyCertificateLimitReachedException() {
        super("You've reached the maximum of 5 documents. Delete an existing one to upload another.");
    }
}
