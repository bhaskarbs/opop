package com.openopportunity.careerguide.exception;

import java.util.UUID;

public class CareerGuideStepNotFoundException extends RuntimeException {

    public CareerGuideStepNotFoundException(UUID id) {
        super("Career guide step not found: " + id);
    }
}
