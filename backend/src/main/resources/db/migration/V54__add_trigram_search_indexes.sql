-- Speeds up job/candidate search's substring matching (JobSpecifications.matchesKeyword/
-- matchesLocation, CandidateProfileSpecifications.matchesQuery/matchesAnyLocation) — all of
-- those build a `lower(column) LIKE '%pattern%'` predicate, and a leading-wildcard LIKE can't
-- use a plain btree index, so at real scale each search becomes a full table scan. pg_trgm's
-- trigram GIN indexes are Postgres's built-in answer to exactly this shape of query.
--
-- Deliberately indexing the same expressions the queries already build (lower(...), and a
-- joined form of the text[] skills columns) rather than switching skills matching to
-- array-containment (skills && ARRAY[...]) against the plain GIN index V9 already added on
-- candidate_profiles.skills — containment would be faster still, but it's an exact,
-- case-sensitive, whole-tag match. The search bar accepts arbitrary free text (e.g. "react"
-- matching a stored "React" skill, or a partial term matching mid-word), and containment would
-- silently stop matching any of that. Same substring behavior, just indexed.
create extension if not exists pg_trgm;

-- array_to_string() is STABLE, not IMMUTABLE (see pg_proc), so Postgres refuses to use it
-- directly in an expression index. This thin wrapper is the standard workaround: joining a
-- text[] with a fixed separator has no non-deterministic behavior for our purposes, so it's
-- safe to assert immutability ourselves. JobSpecifications/CandidateProfileSpecifications call
-- this same function (not the built-in) so the query planner recognizes the match.
create function immutable_array_to_string(text[], text) returns text
    language sql immutable as
$$ select array_to_string($1, $2) $$;

create index idx_jobs_title_trgm on jobs using gin (lower(title) gin_trgm_ops);
create index idx_jobs_company_name_trgm on jobs using gin (lower(company_name) gin_trgm_ops);
create index idx_jobs_location_trgm on jobs using gin (lower(location) gin_trgm_ops);
create index idx_jobs_skills_trgm
    on jobs using gin (lower(immutable_array_to_string(skills, ',')) gin_trgm_ops);

-- idx_candidate_profiles_skills (V9) is a plain array GIN index for containment queries — left
-- in place, but it doesn't help this substring-LIKE query shape, hence the trigram index below.
create index idx_candidate_profiles_title_trgm on candidate_profiles using gin (lower(title) gin_trgm_ops);
create index idx_candidate_profiles_location_trgm
    on candidate_profiles using gin (lower(location) gin_trgm_ops);
create index idx_candidate_profiles_skills_trgm
    on candidate_profiles using gin (lower(immutable_array_to_string(skills, ',')) gin_trgm_ops);

-- Backs CandidateProfileSpecifications.matchesQuery's correlated EXISTS subquery on full_name.
create index idx_users_full_name_trgm on users using gin (lower(full_name) gin_trgm_ops);
