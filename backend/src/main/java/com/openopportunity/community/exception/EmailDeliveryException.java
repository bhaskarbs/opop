package com.openopportunity.community.exception;

public class EmailDeliveryException extends RuntimeException {

    public EmailDeliveryException(Throwable cause) {
        super("Couldn't send the notification email. Please try again later.", cause);
    }
}
