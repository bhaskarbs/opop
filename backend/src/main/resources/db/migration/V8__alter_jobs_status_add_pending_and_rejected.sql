-- Job postings now go through admin moderation (Step 18): companies can only request DRAFT
-- or PENDING_APPROVAL; ACTIVE and REJECTED are admin-only transitions (see JobService).
-- PENDING_APPROVAL (16 chars) doesn't fit the original varchar(10), so widen the column too.
alter table jobs alter column status type varchar(20);
alter table jobs drop constraint jobs_status_check;
alter table jobs add constraint jobs_status_check
    check (status in ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'CLOSED'));
