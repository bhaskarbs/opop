-- candidate_id references auth's users(id) conceptually, same cross-service caveat as
-- ideas.submitter_id (see V16). video_storage_key is where FileStorageService actually put the
-- recorded bytes (see CandidateProfile.resume_storage_key for the same pattern with resumes) —
-- the video itself is served back through MockInterviewController rather than stored inline.
create table mock_interview_sessions (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null,
    category varchar(255) not null,
    question_count integer not null,
    duration_seconds integer not null,
    video_storage_key varchar(500) not null,
    video_content_type varchar(100) not null,
    video_size_bytes bigint not null,
    recorded_at timestamptz not null default now()
);

create index idx_mock_interview_sessions_candidate_id on mock_interview_sessions (candidate_id);
