-- job_id/candidate_id reference the Job and Auth services conceptually (Section 6.1/7.1 of the
-- architecture doc: database-per-service, no cross-service FKs even though all three currently
-- live in one local Postgres instance). job_title/company_name are denormalized snapshots taken
-- at apply time so this service never needs a cross-service join to display an application.
create table applications (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null,
    candidate_id uuid not null,
    job_title varchar(255) not null,
    company_name varchar(255) not null,
    status varchar(20) not null default 'APPLIED'
        check (status in ('APPLIED', 'UNDER_REVIEW', 'REJECTED', 'WITHDRAWN')),
    applied_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (job_id, candidate_id)
);

create index idx_applications_candidate_id on applications (candidate_id);
create index idx_applications_job_id on applications (job_id);
