-- interested_user_id references auth's users(id) conceptually, same cross-service caveat as
-- ideas.submitter_id (see V16). interested_user_name is denormalized at creation time so the
-- idea owner's applicant list never needs a cross-service join. A user can express interest at
-- most once per idea (unique constraint) — re-applying isn't supported, matching how
-- applications.unique(job_id, candidate_id) treats a duplicate job application.
create table idea_interests (
    id uuid primary key default gen_random_uuid(),
    idea_id uuid not null,
    interested_user_id uuid not null,
    interested_user_name varchar(255) not null,
    role varchar(20) not null check (role in ('INVESTOR', 'PARTICIPANT')),
    ticket_size varchar(255),
    message text,
    created_at timestamptz not null default now(),
    unique (idea_id, interested_user_id)
);

create index idx_idea_interests_idea_id on idea_interests (idea_id);

alter table ideas add column interested_count integer not null default 0;
