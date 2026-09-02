-- Backs the "career guide" step-by-step email (com.openopportunity.careerguide) — an
-- admin-configurable, ordered list of short descriptions each linking out to a video to watch,
-- rendered as Step 1/2/3/... buttons. step_order is a plain unique integer the admin service
-- renumbers 1..N on every add/delete/reorder, rather than a linked-list next/prev pointer, since
-- the whole list is always small enough to load and rewrite in one transaction (same reasoning as
-- MAX_JOB_POSTINGS_PER_COMPANY-scale lists elsewhere in this codebase). The unique constraint is
-- deferred to end-of-transaction so a renumbering that shifts several rows (e.g. after a delete)
-- can pass through a transiently colliding intermediate state without needing a two-phase
-- "bump everything to a negative number first" workaround.
create table career_guide_steps (
    id uuid primary key default gen_random_uuid(),
    step_order int not null,
    description varchar(300) not null,
    video_url varchar(2048) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_career_guide_steps_step_order unique (step_order) deferrable initially deferred
);
