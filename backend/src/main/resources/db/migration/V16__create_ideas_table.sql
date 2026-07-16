-- submitter_id references auth's users(id) conceptually, same database-per-service caveat as
-- jobs.company_id (see V4). submitter_name/submitter_role are denormalized at creation time so
-- listing ideas never needs a cross-service join.
create table ideas (
    id uuid primary key default gen_random_uuid(),
    submitter_id uuid not null,
    submitter_name varchar(255) not null,
    submitter_role varchar(20) not null check (submitter_role in ('CANDIDATE', 'COMPANY')),
    title varchar(255) not null,
    category varchar(255) not null,
    stage varchar(20) not null check (stage in ('CONCEPT', 'PROTOTYPE', 'LIVE')),
    problem text not null,
    solution text not null,
    target_market varchar(500) not null,
    funding varchar(255),
    equity varchar(255),
    team_size integer,
    timeline varchar(255),
    video_link varchar(500),
    contact_email varchar(255) not null,
    status varchar(10) not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_ideas_submitter_id on ideas (submitter_id);
create index idx_ideas_status on ideas (status);
