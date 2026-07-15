package com.openopportunity.admin.exception;

public class CompanyProfileIncompleteException extends RuntimeException {

    public CompanyProfileIncompleteException() {
        super("Cannot verify a company whose profile isn't complete yet");
    }
}
