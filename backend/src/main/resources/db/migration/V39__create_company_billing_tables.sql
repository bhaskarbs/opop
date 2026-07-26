-- Backs CompanyBillingPage.tsx. Mirrors candidate_subscriptions/candidate_billing_transactions
-- (see V26/V27/V28) exactly, but as its own table pair rather than shared — company_id and
-- candidate_id aren't the same domain concept even though both reference users(id). Combines
-- all three candidate-billing migrations' end state directly rather than replaying the history.
create table company_subscriptions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null unique,
    plan varchar(20) not null check (plan in ('FREE', 'GROWTH', 'ENTERPRISE')),
    current_period_end timestamptz,
    updated_at timestamptz not null default now()
);

create table company_billing_transactions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null,
    plan varchar(20) not null check (plan in ('FREE', 'GROWTH', 'ENTERPRISE')),
    amount_rupees integer not null,
    status varchar(20) not null check (status in ('PENDING', 'PAID', 'FAILED')),
    razorpay_order_id varchar(64),
    razorpay_payment_id varchar(64),
    created_at timestamptz not null default now()
);

create index idx_company_billing_transactions_company_id
    on company_billing_transactions (company_id, created_at desc);

-- Idempotency guard: a retried webhook trying to mark the same payment PAID a second time hits
-- this constraint, which CompanyBillingService treats as "already processed" rather than
-- inserting/updating a duplicate.
create unique index uq_company_billing_transactions_razorpay_payment_id
    on company_billing_transactions (razorpay_payment_id)
    where razorpay_payment_id is not null;
