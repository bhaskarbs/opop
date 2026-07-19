-- Category turned out to be an unnecessary axis — skills, industry, and experience level already
-- carry the signal that mattered for both recorded sessions and the question bank, so it's
-- dropped outright rather than left nullable/unused. Per the "never edit an already-applied
-- migration" rule, this is a new migration rather than reopening V20/V21 (mock_interview_sessions)
-- or V23 (mock_interview_questions). Dropping mock_interview_questions.category also drops
-- idx_mock_interview_questions_category, which was defined on it (Postgres cascades that
-- automatically).
alter table mock_interview_sessions drop column category;
alter table mock_interview_questions drop column category;

-- Enforces question-bank uniqueness at the DB level (case-insensitive) rather than relying
-- solely on the app-level existsByTextIgnoreCase check in MockInterviewQuestionService /
-- AdminMockInterviewQuestionService, which can't prevent a race between concurrent inserts.
create unique index uq_mock_interview_questions_text on mock_interview_questions (lower(text));
