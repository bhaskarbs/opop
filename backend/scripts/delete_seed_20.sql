-- Deletes exactly the rows recorded in seed_manifest by seed_20.sql, in FK-safe order, then
-- drops the manifest table. Safe to run only after seed_20.sql — if seed_manifest doesn't
-- exist, this errors out immediately instead of silently doing nothing.

BEGIN;

-- refresh_tokens has a real FK to users and gets a row on every login — delete first so the
-- later `DELETE FROM users` below doesn't hit a foreign key violation.
DELETE FROM refresh_tokens
WHERE user_id IN (
    SELECT entity_id FROM seed_manifest WHERE entity_type = 'company_user'
);

DELETE FROM jobs
WHERE id IN (SELECT entity_id FROM seed_manifest WHERE entity_type = 'job');

DELETE FROM ideas
WHERE id IN (SELECT entity_id FROM seed_manifest WHERE entity_type = 'idea');

DELETE FROM company_profiles
WHERE id IN (SELECT entity_id FROM seed_manifest WHERE entity_type = 'company_profile');

DELETE FROM users
WHERE id IN (
    SELECT entity_id FROM seed_manifest WHERE entity_type = 'company_user'
);

DROP TABLE seed_manifest;

COMMIT;
