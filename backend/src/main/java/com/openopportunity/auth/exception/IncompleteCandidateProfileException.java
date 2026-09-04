package com.openopportunity.auth.exception;

public class IncompleteCandidateProfileException extends RuntimeException {

    public IncompleteCandidateProfileException() {
        super("Candidate registration requires a mobile number");
    }
}
