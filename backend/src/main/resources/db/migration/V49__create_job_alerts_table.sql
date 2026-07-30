-- candidate_id references the Auth service conceptually (same no-cross-service-FK convention as
-- saved_jobs/applications — see V5/V48). keywords/locations mirror jobs.skills' text[] shape
-- (see the jobs table migration) since alert matching reuses the same JobSpecifications the
-- public job search bar uses. last_notified_at starts equal to created_at so the first nightly
-- sweep only reports jobs posted after the alert was created, not every existing match.
create table job_alerts (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null,
    keywords text[] not null default '{}',
    locations text[] not null default '{}',
    experience_level varchar(20),
    work_mode varchar(20),
    created_at timestamptz not null default now(),
    last_notified_at timestamptz not null default now()
);

create index idx_job_alerts_candidate_id on job_alerts (candidate_id);
