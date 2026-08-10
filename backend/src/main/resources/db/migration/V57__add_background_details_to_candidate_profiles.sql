-- All nullable — none of these are collected at registration; candidates fill them in later via
-- CandidateProfilePage/AddMissingDetailsPage, same treatment as location/title/experience_level
-- (see V12/V22). years_of_experience is a self-reported decimal (allows "2.5 years"), distinct
-- from the coarse experience_level bucket. current_salary_lakhs mirrors jobs.salary_min_lakhs/
-- salary_max_lakhs (V4) so figures are directly comparable to the salary ranges shown on jobs.
alter table candidate_profiles
    add column years_of_experience numeric(4, 1)
        check (years_of_experience >= 0),
    add column current_salary_lakhs numeric(6, 2)
        check (current_salary_lakhs >= 0),
    add column notice_period varchar(20)
        check (notice_period in ('IMMEDIATE', 'DAYS_15', 'MONTH_1', 'MONTH_2', 'MONTHS_3_PLUS')),
    add column education_degree varchar(255),
    add column education_institution varchar(255),
    add column education_graduation_year integer
        check (education_graduation_year between 1950 and 2100);
