-- Auth Service's own table (Section 6.1 of the architecture doc: Auth Service owns auth_db,
-- separate from the future User/Profile Service's richer candidate/company profile data).
-- Holds only what's needed to authenticate; profile fields (skills, resume, CIN/GSTIN, etc.)
-- belong to a later profile-focused step.
create table users (
    id uuid primary key default gen_random_uuid(),
    email varchar(255) not null unique,
    password_hash varchar(255) not null,
    full_name varchar(255) not null,
    role varchar(20) not null check (role in ('CANDIDATE', 'COMPANY', 'ADMIN')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
