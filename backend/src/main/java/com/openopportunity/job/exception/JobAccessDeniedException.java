package com.openopportunity.job.exception;

public class JobAccessDeniedException extends RuntimeException {

    public JobAccessDeniedException() {
        super("You don't have permission to modify this job posting");
    }
}
