package com.openopportunity.admin.exception;

/** Also thrown when a super-admin tries to delete their own account through this endpoint —
 * same "not allowed" outcome, kept as one exception type rather than two since the frontend only
 * ever needs to show a generic "can't remove this account" message either way. */
public class CannotDeleteSuperAdminException extends RuntimeException {

    public CannotDeleteSuperAdminException() {
        super("Super admin accounts can't be removed here");
    }
}
