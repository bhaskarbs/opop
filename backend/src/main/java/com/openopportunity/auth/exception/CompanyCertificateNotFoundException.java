package com.openopportunity.auth.exception;

import java.util.UUID;

public class CompanyCertificateNotFoundException extends RuntimeException {

    public CompanyCertificateNotFoundException(UUID certificateId) {
        super("Certificate " + certificateId + " not found");
    }
}
