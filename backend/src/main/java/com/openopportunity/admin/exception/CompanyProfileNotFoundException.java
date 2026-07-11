package com.openopportunity.admin.exception;

import java.util.UUID;

public class CompanyProfileNotFoundException extends RuntimeException {

    public CompanyProfileNotFoundException(UUID userId) {
        super("No company profile found for user " + userId);
    }
}
