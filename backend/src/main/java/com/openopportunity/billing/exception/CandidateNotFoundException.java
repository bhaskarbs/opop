package com.openopportunity.billing.exception;

import java.util.UUID;

public class CandidateNotFoundException extends RuntimeException {

    public CandidateNotFoundException(UUID id) {
        super("No candidate found with id " + id);
    }
}
