-- Only a SHA-256 hash of each refresh token is stored (never the raw value), the same
-- principle as password_hash on users — a database leak alone can't be replayed as a session.
create table refresh_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users (id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_refresh_tokens_user_id on refresh_tokens (user_id);
