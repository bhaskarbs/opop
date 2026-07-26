package com.openopportunity.auth.exception;

import java.util.UUID;

public class CompanyLogoNotFoundException extends RuntimeException {

    public CompanyLogoNotFoundException(UUID companyId) {
        super("No logo found for company " + companyId);
    }
}
