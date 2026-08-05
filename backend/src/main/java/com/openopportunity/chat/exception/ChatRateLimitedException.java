package com.openopportunity.chat.exception;

public class ChatRateLimitedException extends RuntimeException {

    public ChatRateLimitedException() {
        super("Too many chat messages. Please wait a while and try again.");
    }
}
