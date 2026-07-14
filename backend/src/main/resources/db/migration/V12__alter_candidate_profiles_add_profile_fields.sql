-- Fields the candidate profile page lets a candidate fill in beyond what registration
-- collects (see RegisterPage vs CandidateProfilePage) — all nullable since none of them
-- are required at registration time.
alter table candidate_profiles
    add column location varchar(255),
    add column title varchar(255),
    add column life_goals text,
    add column work_culture text,
    add column resume_uploaded_at timestamptz,
    add column resume_size_bytes bigint;
