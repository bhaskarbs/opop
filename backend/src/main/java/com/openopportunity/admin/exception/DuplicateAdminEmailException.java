package com.openopportunity.admin.exception;

public class DuplicateAdminEmailException extends RuntimeException {

    public DuplicateAdminEmailException(String email) {
        super("An admin-tier account with email " + email + " already exists");
    }
}
