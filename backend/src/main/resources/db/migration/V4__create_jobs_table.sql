-- company_id references auth's users(id) conceptually (Job Service owns job_db, Auth Service
-- owns auth_db — Section 6.1/7.1 of the architecture doc: database-per-service, no cross-service
-- FKs even though both currently live in one local Postgres instance). company_name is
-- denormalized from the company user's full_name at creation time so job search/listing never
-- needs a cross-service join.
create table jobs (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null,
    company_name varchar(255) not null,
    title varchar(255) not null,
    employment_type varchar(20) not null
        check (employment_type in ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP')),
    experience_level varchar(20) not null
        check (experience_level in ('ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR', 'LEADERSHIP')),
    work_mode varchar(20) not null check (work_mode in ('REMOTE', 'HYBRID', 'ON_SITE')),
    location varchar(255) not null,
    salary_min_lakhs numeric(6, 2),
    salary_max_lakhs numeric(6, 2),
    application_deadline date,
    about_role text not null,
    responsibilities text[] not null default '{}',
    requirements text[] not null default '{}',
    skills text[] not null default '{}',
    status varchar(10) not null default 'ACTIVE' check (status in ('ACTIVE', 'DRAFT', 'CLOSED')),
    applicant_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_jobs_company_id on jobs (company_id);
create index idx_jobs_status on jobs (status);
