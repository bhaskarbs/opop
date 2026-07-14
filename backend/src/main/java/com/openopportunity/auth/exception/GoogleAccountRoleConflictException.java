package com.openopportunity.auth.exception;

public class GoogleAccountRoleConflictException extends RuntimeException {

    public GoogleAccountRoleConflictException() {
        super("This email is already registered as a different account type — log in with a password instead");
    }
}
