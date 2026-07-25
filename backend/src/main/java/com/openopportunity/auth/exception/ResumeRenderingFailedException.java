package com.openopportunity.auth.exception;

import java.util.UUID;

public class ResumeRenderingFailedException extends RuntimeException {

    public ResumeRenderingFailedException(UUID candidateUserId, Throwable cause) {
        super("Could not render resume for candidate " + candidateUserId, cause);
    }
}
