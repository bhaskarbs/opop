package com.openopportunity.mockinterview.exception;

public class MockInterviewShareLinkNotFoundException extends RuntimeException {

    public MockInterviewShareLinkNotFoundException() {
        super("This share link is invalid or no longer exists");
    }
}
