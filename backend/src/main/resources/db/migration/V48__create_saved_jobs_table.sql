-- candidate_id/job_id reference the Auth and Job services conceptually (Section 6.1's
-- database-per-service split, same no-cross-service-FK convention as applications — see V5).
-- Unlike applications, nothing is denormalized here: a saved job is a live bookmark, and
-- SavedJobService re-fetches the current Job row (title/salary/status/...) to display it, so
-- there's no snapshot to keep in sync.
create table saved_jobs (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null,
    job_id uuid not null,
    created_at timestamptz not null default now(),
    unique (candidate_id, job_id)
);

create index idx_saved_jobs_candidate_id on saved_jobs (candidate_id);
