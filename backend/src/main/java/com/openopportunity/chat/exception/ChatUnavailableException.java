package com.openopportunity.chat.exception;

public class ChatUnavailableException extends RuntimeException {

    public ChatUnavailableException() {
        super("Chat support is temporarily unavailable");
    }
}
