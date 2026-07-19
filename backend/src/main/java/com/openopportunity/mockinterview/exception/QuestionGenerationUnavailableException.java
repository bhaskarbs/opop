package com.openopportunity.mockinterview.exception;

public class QuestionGenerationUnavailableException extends RuntimeException {

    public QuestionGenerationUnavailableException() {
        super("Question generation is temporarily unavailable");
    }
}
