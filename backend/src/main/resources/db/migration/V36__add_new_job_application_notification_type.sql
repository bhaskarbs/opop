-- Adds NEW_JOB_APPLICATION (notifies a company when a candidate applies to its job posting,
-- see ApplicationService.apply) to the notifications.type check constraint from V25.
alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check
    check (type in (
        'JOB_APPROVED', 'JOB_REJECTED',
        'IDEA_APPROVED', 'IDEA_REJECTED', 'IDEA_INTEREST_RECEIVED',
        'COMPANY_VERIFIED', 'COMPANY_REJECTED',
        'APPLICATION_STATUS_CHANGED',
        'NEW_JOB_APPLICATION'
    ));
