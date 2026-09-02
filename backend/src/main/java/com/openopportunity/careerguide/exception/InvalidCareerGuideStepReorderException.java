package com.openopportunity.careerguide.exception;

public class InvalidCareerGuideStepReorderException extends RuntimeException {

    public InvalidCareerGuideStepReorderException() {
        super("orderedStepIds must contain every existing step's id exactly once");
    }
}
