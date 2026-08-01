package com.openopportunity.admin.exception;

public class InvalidAdminLevelException extends RuntimeException {

    public InvalidAdminLevelException(String adminLevel) {
        super("Unsupported admin level: " + adminLevel + " (expected reviewer or admin)");
    }
}
