-- Admin uploads a video, then generates a per-recipient share link (its own row here, one per
-- recipient) rather than one shared link for everyone — that's what makes "who watched how much"
-- trackable per person rather than as one anonymous aggregate.
create table admin_shared_videos (
    id uuid primary key default gen_random_uuid(),
    uploaded_by uuid not null references users(id) on delete cascade,
    title varchar(255) not null,
    storage_key varchar(500) not null,
    content_type varchar(100) not null,
    size_bytes bigint not null,
    -- Captured client-side (the admin's browser reads the file's own metadata before upload) —
    -- null if that somehow failed, in which case "percent watched" just can't be shown.
    duration_seconds integer,
    created_at timestamptz not null default now()
);
create index idx_admin_shared_videos_uploaded_by on admin_shared_videos(uploaded_by);

create table admin_video_shares (
    id uuid primary key default gen_random_uuid(),
    video_id uuid not null references admin_shared_videos(id) on delete cascade,
    recipient_name varchar(255) not null,
    recipient_email varchar(255) not null,
    -- Opaque, unguessable — this alone (not a login) is what gates access to the public watch
    -- page, so it needs real entropy (see AdminVideoService, generated via SecureRandom).
    share_token varchar(64) not null unique,
    max_watched_seconds integer not null default 0,
    view_count integer not null default 0,
    first_viewed_at timestamptz,
    last_viewed_at timestamptz,
    created_at timestamptz not null default now()
);
create index idx_admin_video_shares_video on admin_video_shares(video_id);
