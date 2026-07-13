package com.openopportunity.auth.exception;

public class IncompleteCandidateProfileException extends RuntimeException {

    public IncompleteCandidateProfileException() {
        super("Candidate registration requires mobile and at least one skill");
    }
}
