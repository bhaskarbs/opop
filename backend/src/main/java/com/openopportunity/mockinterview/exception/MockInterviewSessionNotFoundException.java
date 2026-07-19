package com.openopportunity.mockinterview.exception;

import java.util.UUID;

public class MockInterviewSessionNotFoundException extends RuntimeException {

    public MockInterviewSessionNotFoundException(UUID id) {
        super("No mock interview session found with id " + id);
    }
}
