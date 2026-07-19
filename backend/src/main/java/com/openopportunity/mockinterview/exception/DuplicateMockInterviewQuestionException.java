package com.openopportunity.mockinterview.exception;

public class DuplicateMockInterviewQuestionException extends RuntimeException {

    public DuplicateMockInterviewQuestionException() {
        super("A question with this text already exists");
    }
}
