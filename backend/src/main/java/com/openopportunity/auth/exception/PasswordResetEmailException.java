package com.openopportunity.auth.exception;

/** Mirrors com.openopportunity.community.exception.EmailDeliveryException — kept as a separate
 * type in this package rather than reused across modules, since AuthService and
 * CommunityInterestService are otherwise unrelated. */
public class PasswordResetEmailException extends RuntimeException {

    public PasswordResetEmailException(Throwable cause) {
        super("Couldn't send the password reset email. Please try again later.", cause);
    }
}
