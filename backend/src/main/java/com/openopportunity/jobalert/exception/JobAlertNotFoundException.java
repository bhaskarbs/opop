package com.openopportunity.jobalert.exception;

import java.util.UUID;

public class JobAlertNotFoundException extends RuntimeException {

    public JobAlertNotFoundException(UUID id) {
        super("No job alert found with id " + id);
    }
}
