package com.openopportunity.mockinterview.exception;

public class MockInterviewSessionLimitReachedException extends RuntimeException {

    public MockInterviewSessionLimitReachedException() {
        super("You can only keep 3 recorded sessions — delete one before recording a new one.");
    }
}
