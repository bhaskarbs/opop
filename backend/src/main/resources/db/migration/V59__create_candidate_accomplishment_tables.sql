-- Three repeatable, candidate-owned lists — work samples and research papers are just a
-- title/url/description triple (kept as separate tables rather than one type-discriminated
-- table, matching how this codebase prefers one table per concept over a shared table with a
-- "kind" column); certifications additionally carry an optional logo image, stored the same way
-- CompanyCertificate (V44) stores its file. candidate_id references users(id) with cascade
-- delete, same FK shape as company_certificates.
create table candidate_work_samples (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null references users(id) on delete cascade,
    title varchar(255) not null,
    url varchar(2048) not null,
    description text,
    created_at timestamptz not null default now()
);
create index idx_candidate_work_samples_candidate on candidate_work_samples(candidate_id);

create table candidate_research_papers (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null references users(id) on delete cascade,
    title varchar(255) not null,
    url varchar(2048) not null,
    description text,
    created_at timestamptz not null default now()
);
create index idx_candidate_research_papers_candidate on candidate_research_papers(candidate_id);

create table candidate_certifications (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null references users(id) on delete cascade,
    name varchar(255) not null,
    certification_id varchar(255),
    certification_url varchar(2048),
    -- Both null until a logo is uploaded — optional, unlike name.
    logo_storage_key varchar(500),
    logo_content_type varchar(100),
    created_at timestamptz not null default now()
);
create index idx_candidate_certifications_candidate on candidate_certifications(candidate_id);
