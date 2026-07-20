-- Backs CandidateBillingPage.tsx. candidate_id references auth's users(id) conceptually, same
-- cross-service caveat as ideas.submitter_id (see V16). A candidate has no row here until they
-- first change plans — CandidateBillingService treats "no row" as FREE rather than eagerly
-- inserting one at registration (same lazy-default treatment as candidate_profiles' optional
-- fields).
create table candidate_subscriptions (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null unique,
    plan varchar(20) not null check (plan in ('FREE', 'PLUS', 'PRO')),
    updated_at timestamptz not null default now()
);

-- One row per plan change — both the audit trail and the "billing history" list shown on the
-- page. There's no real payment gateway in this phase (see docs/DEVELOPMENT_ROADMAP.md), so every
-- transaction is recorded as an immediately-successful mock payment.
create table candidate_billing_transactions (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null,
    plan varchar(20) not null check (plan in ('FREE', 'PLUS', 'PRO')),
    amount_rupees integer not null,
    status varchar(20) not null check (status in ('PAID')),
    created_at timestamptz not null default now()
);

create index idx_candidate_billing_transactions_candidate_id
    on candidate_billing_transactions (candidate_id, created_at desc);
