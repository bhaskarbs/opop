package com.openopportunity.job.exception;

public class JobPostingLimitReachedException extends RuntimeException {

    public JobPostingLimitReachedException() {
        super("You've reached the maximum of 10 job postings. Delete an existing posting to add a new one.");
    }
}
