package com.openopportunity.auth.exception;

import java.util.UUID;

public class CandidateCertificationLogoNotFoundException extends RuntimeException {

    public CandidateCertificationLogoNotFoundException(UUID certificationId) {
        super("No logo uploaded for certification " + certificationId);
    }
}
