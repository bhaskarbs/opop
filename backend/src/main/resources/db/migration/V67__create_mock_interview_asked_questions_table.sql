-- Tracks which bank questions (mock_interview_questions.id) a candidate has already been asked,
-- across every session/practice run they've ever started — not just their 3 saved recordings
-- (see MockInterviewService.MAX_SESSIONS, which caps recorded videos, not question generation).
-- MockInterviewQuestionService.getSessionQuestions excludes these from both the bank pick and
-- the AI-generation path, so the same question is never served to the same candidate twice. No
-- FK to mock_interview_questions or candidates — same no-cross-service-FK convention as every
-- other table in this schema (see V4's comment on jobs.company_id).
create table mock_interview_asked_questions (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null,
    question_id uuid not null,
    asked_at timestamptz not null default now(),
    unique (candidate_id, question_id)
);

create index idx_mock_interview_asked_questions_candidate_id on mock_interview_asked_questions (candidate_id);
