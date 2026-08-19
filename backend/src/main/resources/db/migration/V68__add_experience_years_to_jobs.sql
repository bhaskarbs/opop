-- Optional "N-M years of experience" range a company/admin can set on a job posting (distinct
-- from experience_level's coarse Entry/Mid/Senior/Leadership tier) — shown on the job detail
-- page as e.g. "2-4 years". Both null (the default, and the only state for every existing row)
-- means "not specified", same optional-range convention as salary_min_lakhs/salary_max_lakhs.
alter table jobs add column experience_years_min integer;
alter table jobs add column experience_years_max integer;
