-- Lets a candidate copy/share a public link to a specific recording with anyone (not just
-- companies via visible_to_companies) — see MockInterviewShareController, the public
-- unauthenticated counterpart to MockInterviewController. Every new session gets one at creation
-- (see MockInterviewService#generateShareToken); existing rows are backfilled here with an
-- equally unguessable value built from two concatenated UUIDs, avoiding a dependency on the
-- pgcrypto extension (gen_random_bytes) that plain gen_random_uuid() (core since PG13) doesn't
-- need.
alter table mock_interview_sessions
    add column share_token varchar(64);

update mock_interview_sessions
set share_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where share_token is null;

alter table mock_interview_sessions
    alter column share_token set not null,
    add constraint uq_mock_interview_sessions_share_token unique (share_token);
