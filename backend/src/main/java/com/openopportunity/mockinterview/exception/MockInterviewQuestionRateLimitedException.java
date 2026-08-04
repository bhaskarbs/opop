package com.openopportunity.mockinterview.exception;

public class MockInterviewQuestionRateLimitedException extends RuntimeException {

    public MockInterviewQuestionRateLimitedException() {
        super("Too many question-generation requests. Please wait a while and try again.");
    }
}
