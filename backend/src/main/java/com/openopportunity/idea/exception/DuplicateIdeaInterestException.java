package com.openopportunity.idea.exception;

public class DuplicateIdeaInterestException extends RuntimeException {

    public DuplicateIdeaInterestException() {
        super("You've already expressed interest in this idea");
    }
}
