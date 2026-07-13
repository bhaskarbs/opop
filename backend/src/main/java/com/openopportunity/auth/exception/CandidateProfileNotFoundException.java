package com.openopportunity.auth.exception;

import java.util.UUID;

public class CandidateProfileNotFoundException extends RuntimeException {

    public CandidateProfileNotFoundException(UUID userId) {
        super("No candidate profile found for user " + userId);
    }
}
