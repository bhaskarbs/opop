package com.openopportunity.idea.exception;

public class IdeaLimitReachedException extends RuntimeException {

    public IdeaLimitReachedException() {
        super("You've reached the maximum of 5 ideas. Delete an existing idea to post a new one.");
    }
}
