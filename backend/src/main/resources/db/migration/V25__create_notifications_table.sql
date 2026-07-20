-- Backs the notification bell in Header.tsx. recipient_user_id references auth's users(id)
-- conceptually, same cross-service caveat as ideas.submitter_id (see V16) — notifications can be
-- addressed to a candidate, company, or admin user, so it isn't scoped to any one role's table.
create table notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_user_id uuid not null,
    type varchar(40) not null
        check (type in (
            'JOB_APPROVED', 'JOB_REJECTED',
            'IDEA_APPROVED', 'IDEA_REJECTED', 'IDEA_INTEREST_RECEIVED',
            'COMPANY_VERIFIED', 'COMPANY_REJECTED',
            'APPLICATION_STATUS_CHANGED'
        )),
    message text not null,
    -- App-relative route (no /:lang prefix — the frontend adds that) the notification links to,
    -- e.g. /candidate/applications. Null when a notification has nothing to navigate to.
    link varchar(500),
    read boolean not null default false,
    created_at timestamptz not null default now()
);

create index idx_notifications_recipient_user_id on notifications (recipient_user_id, created_at desc);
-- Speeds up the unread-count badge query (NotificationRepository.countByRecipientUserIdAndReadFalse).
create index idx_notifications_recipient_unread on notifications (recipient_user_id) where not read;
