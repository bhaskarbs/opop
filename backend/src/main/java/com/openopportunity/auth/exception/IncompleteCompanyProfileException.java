package com.openopportunity.auth.exception;

public class IncompleteCompanyProfileException extends RuntimeException {

    public IncompleteCompanyProfileException() {
        super(
                "Company registration requires entityType, pan, industry, address, signatoryName, and contactNumber");
    }

    public IncompleteCompanyProfileException(String message) {
        super(message);
    }
}
