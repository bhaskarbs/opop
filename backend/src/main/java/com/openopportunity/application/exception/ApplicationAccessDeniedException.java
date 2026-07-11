package com.openopportunity.application.exception;

public class ApplicationAccessDeniedException extends RuntimeException {

    public ApplicationAccessDeniedException() {
        super("You don't have permission to modify this application");
    }
}
