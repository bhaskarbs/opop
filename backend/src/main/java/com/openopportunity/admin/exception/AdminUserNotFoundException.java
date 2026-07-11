package com.openopportunity.admin.exception;

import java.util.UUID;

public class AdminUserNotFoundException extends RuntimeException {

    public AdminUserNotFoundException(UUID id) {
        super("No user found with id " + id);
    }
}
