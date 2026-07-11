package com.openopportunity.job.exception;

public class InvalidJobStatusTransitionException extends RuntimeException {

    public InvalidJobStatusTransitionException() {
        super("A job can only be created or updated as DRAFT or PENDING_APPROVAL — "
                + "ACTIVE and REJECTED are set by admin approval/rejection");
    }
}
