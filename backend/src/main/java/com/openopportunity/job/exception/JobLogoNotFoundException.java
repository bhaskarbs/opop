package com.openopportunity.job.exception;

import java.util.UUID;

public class JobLogoNotFoundException extends RuntimeException {

    public JobLogoNotFoundException(UUID jobId) {
        super("No custom logo found for job " + jobId);
    }
}
