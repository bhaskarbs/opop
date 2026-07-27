create table community_interest_submissions (
    id uuid primary key default gen_random_uuid(),
    name varchar(255) not null,
    company_name varchar(255),
    email varchar(255) not null,
    phone varchar(20),
    created_at timestamptz not null default now()
);
