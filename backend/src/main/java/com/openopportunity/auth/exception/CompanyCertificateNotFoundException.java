package com.openopportunity.auth.exception;

import java.util.UUID;

public class CompanyCertificateNotFoundException extends RuntimeException {

    public CompanyCertificateNotFoundException(UUID companyId) {
        super("No certificate found for company " + companyId);
    }
}
