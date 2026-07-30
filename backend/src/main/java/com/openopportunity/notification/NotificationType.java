package com.openopportunity.notification;

public enum NotificationType {
    JOB_APPROVED,
    JOB_REJECTED,
    IDEA_APPROVED,
    IDEA_REJECTED,
    IDEA_INTEREST_RECEIVED,
    COMPANY_VERIFIED,
    COMPANY_REJECTED,
    APPLICATION_STATUS_CHANGED,
    NEW_JOB_APPLICATION,
    /** Admin-facing — a job posting has entered the review queue (see
     * NotificationService.notifyAdmins). */
    JOB_PENDING_APPROVAL,
    /** Admin-facing — an idea has entered the review queue. */
    IDEA_PENDING_APPROVAL,
    /** Admin-facing — a company profile has entered the verification queue. */
    COMPANY_PENDING_VERIFICATION
}
