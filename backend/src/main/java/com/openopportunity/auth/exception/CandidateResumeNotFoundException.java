package com.openopportunity.auth.exception;

import java.util.UUID;

public class CandidateResumeNotFoundException extends RuntimeException {

    public CandidateResumeNotFoundException(UUID candidateUserId) {
        super("No resume uploaded for candidate " + candidateUserId);
    }
}
