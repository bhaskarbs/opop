package com.openopportunity.mockinterview.exception;

import java.util.UUID;

public class MockInterviewQuestionNotFoundException extends RuntimeException {

    public MockInterviewQuestionNotFoundException(UUID id) {
        super("Mock interview question not found: " + id);
    }
}
