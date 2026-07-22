package com.openopportunity.auth.exception;

/** Mirrors PasswordResetEmailException — kept distinct since the two flows have unrelated
 * causes/messages even though both wrap a MailException. */
public class EmailVerificationEmailException extends RuntimeException {

    public EmailVerificationEmailException(Throwable cause) {
        super("Couldn't send the verification email. Please try again later.", cause);
    }
}
