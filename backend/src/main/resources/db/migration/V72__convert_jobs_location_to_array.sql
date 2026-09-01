-- A job posting can now cover multiple locations (e.g. "Bengaluru, Mumbai, Remote") instead of
-- exactly one. Same text[] convention already used for responsibilities/requirements/skills on
-- this same table (see V4) and for job_alerts.locations (see V49) — no new pattern here.
alter table jobs add column locations text[];
update jobs set locations = array[location];
alter table jobs alter column locations set not null;
alter table jobs alter column locations set default '{}';
alter table jobs drop column location;

-- Replaces idx_jobs_location_trgm (a plain lower(location) index, which no longer exists now
-- that location is an array) with the same immutable_array_to_string(...) + trigram approach
-- idx_jobs_skills_trgm already uses (see V54) — the function already exists, no need to redefine
-- it here.
drop index if exists idx_jobs_location_trgm;
create index idx_jobs_locations_trgm
    on jobs using gin (lower(immutable_array_to_string(locations, ',')) gin_trgm_ops);
