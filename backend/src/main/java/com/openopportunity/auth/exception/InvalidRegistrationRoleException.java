package com.openopportunity.auth.exception;

public class InvalidRegistrationRoleException extends RuntimeException {

    public InvalidRegistrationRoleException(String role) {
        super("Unsupported account type: " + role + " (expected candidate or company)");
    }
}
