package com.openopportunity.careerguide.exception;

public class NoCareerGuideStepsConfiguredException extends RuntimeException {

    public NoCareerGuideStepsConfiguredException() {
        super("Add at least one step before sending the career guide email.");
    }
}
