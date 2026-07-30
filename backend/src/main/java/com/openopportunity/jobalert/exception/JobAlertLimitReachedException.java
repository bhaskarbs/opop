package com.openopportunity.jobalert.exception;

public class JobAlertLimitReachedException extends RuntimeException {

    public JobAlertLimitReachedException() {
        super("You've reached the maximum of 10 job alerts. Delete an existing alert to add a new one.");
    }
}
