package com.openopportunity.careerguide.exception;

/** Mirrors com.openopportunity.auth.exception.PasswordResetEmailException — wraps a MailException
 * from CareerGuideEmailService so an admin's "send test email" click gets a clean error instead
 * of a raw 500. */
public class CareerGuideEmailSendException extends RuntimeException {

    public CareerGuideEmailSendException(Throwable cause) {
        super("Couldn't send the career guide email. Please try again later.", cause);
    }
}
