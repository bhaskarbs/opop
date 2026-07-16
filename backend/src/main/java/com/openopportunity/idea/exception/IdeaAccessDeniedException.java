package com.openopportunity.idea.exception;

public class IdeaAccessDeniedException extends RuntimeException {

    public IdeaAccessDeniedException() {
        super("You don't have permission to view or modify this idea");
    }
}
