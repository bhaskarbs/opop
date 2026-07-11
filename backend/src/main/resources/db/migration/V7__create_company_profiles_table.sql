-- One row per COMPANY-role user, holding the verification details collected at company
-- registration (CIN/GSTIN/PAN etc.) that Auth's own users table deliberately doesn't carry
-- (Section 6.1: Auth Service owns authentication, not richer profile data — but company
-- verification is the one piece of "profile" data that gates whether the account can act,
-- which is squarely an auth/account-standing concern, unlike a candidate's resume or skills).
create table company_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique,
    entity_type varchar(100) not null,
    cin varchar(50) not null,
    gstin varchar(20) not null,
    pan varchar(20) not null,
    industry varchar(255) not null,
    address text not null,
    signatory_name varchar(255) not null,
    verification_status varchar(20) not null default 'PENDING'
        check (verification_status in ('PENDING', 'VERIFIED', 'REJECTED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_company_profiles_verification_status on company_profiles (verification_status);
