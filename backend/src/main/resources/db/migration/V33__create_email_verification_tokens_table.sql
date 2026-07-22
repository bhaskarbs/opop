-- Single-use, hashed tokens for AuthService's candidate email verification flow — same shape
-- and hash-only-at-rest principle as password_reset_tokens (see V31).
create table email_verification_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_email_verification_tokens_user_id on email_verification_tokens (user_id);
