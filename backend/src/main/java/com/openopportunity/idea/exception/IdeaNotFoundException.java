package com.openopportunity.idea.exception;

import java.util.UUID;

public class IdeaNotFoundException extends RuntimeException {

    public IdeaNotFoundException(UUID id) {
        super("No idea found with id " + id);
    }
}
