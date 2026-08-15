-- Experience level becomes multi-select (a question can apply to more than one level, e.g.
-- both Entry and Mid) — mirrors the existing skills text[] column exactly. NULL previously meant
-- "any experience level"; an empty array carries the same meaning going forward, so existing
-- unset rows backfill to '{}', not a one-element array.
alter table mock_interview_questions add column experience_levels text[] not null default '{}';

update mock_interview_questions
set experience_levels = array[experience_level::text]
where experience_level is not null;

alter table mock_interview_questions drop column experience_level;

-- Optional (nullable, same treatment as industry/skills before it existed) — only admin-created
-- questions set this for now, AI-generated ones leave it unset.
alter table mock_interview_questions add column difficulty varchar(20);
