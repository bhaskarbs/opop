-- Adds JOB_PENDING_APPROVAL, IDEA_PENDING_APPROVAL, and COMPANY_PENDING_VERIFICATION (admin-facing
-- notifications fanned out via NotificationService.notifyAdmins) to the notifications.type check
-- constraint from V25/V36.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
    check (type in (
        'JOB_APPROVED', 'JOB_REJECTED',
        'IDEA_APPROVED', 'IDEA_REJECTED', 'IDEA_INTEREST_RECEIVED',
        'COMPANY_VERIFIED', 'COMPANY_REJECTED',
        'APPLICATION_STATUS_CHANGED',
        'NEW_JOB_APPLICATION',
        'JOB_PENDING_APPROVAL', 'IDEA_PENDING_APPROVAL', 'COMPANY_PENDING_VERIFICATION'
    ));
