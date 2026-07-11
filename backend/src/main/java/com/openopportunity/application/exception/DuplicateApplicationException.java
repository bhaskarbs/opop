package com.openopportunity.application.exception;

public class DuplicateApplicationException extends RuntimeException {

    public DuplicateApplicationException() {
        super("You've already applied to this job");
    }
}
