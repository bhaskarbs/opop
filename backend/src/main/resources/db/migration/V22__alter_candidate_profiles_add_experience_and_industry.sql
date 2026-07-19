-- Both nullable — neither is collected at registration, same treatment as location/title
-- (see V12). experience_level reuses the same enum as jobs.experience_level (V4) so a
-- candidate's own level lines up with the levels they'd filter job search by.
alter table candidate_profiles
    add column experience_level varchar(20)
        check (experience_level in ('ENTRY_LEVEL', 'MID_LEVEL', 'SENIOR', 'LEADERSHIP')),
    add column industry varchar(255);
