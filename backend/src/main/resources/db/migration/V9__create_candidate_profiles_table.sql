-- One row per CANDIDATE-role user, mirroring company_profiles (V7): auth's own users table
-- stays authentication-only, richer candidate profile data (mobile, skills, resume) lives here
-- instead, keeping the hot login/register path narrow and letting this table evolve/index
-- independently (e.g. the GIN index below for skill-based candidate search).
create table candidate_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique,
    mobile varchar(20) not null,
    skills text[] not null,
    -- File content isn't stored anywhere yet (no object-storage service built) — only the
    -- filename the candidate uploaded, same treatment as company_profiles.certificate_file_name.
    resume_file_name varchar(255),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_candidate_profiles_skills on candidate_profiles using gin (skills);
