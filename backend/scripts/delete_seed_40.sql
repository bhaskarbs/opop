-- Deletes exactly the rows recorded in seed_manifest_40 by seed_40.sql, in FK-safe order, then
-- drops the manifest table. Uses its own manifest table (not seed_manifest, which seed_20.sql
-- uses) specifically so the two seed sets can be added/removed independently — running this
-- never touches anything seed_20.sql created, and vice versa. Safe to run only after
-- seed_40.sql — if seed_manifest_40 doesn't exist, this errors out immediately instead of
-- silently doing nothing.

BEGIN;

-- refresh_tokens/password_reset_tokens/candidate_contact_reveals/company_certificates all have a
-- real FK to users with ON DELETE CASCADE (see the relevant migrations), so deleting the users
-- below would clean these up automatically — deleted explicitly anyway for the same
-- fail-loudly-not-silently reasoning as delete_seed_20.sql.
DELETE FROM refresh_tokens
WHERE user_id IN (
    SELECT entity_id FROM seed_manifest_40 WHERE entity_type = 'company_user'
);

DELETE FROM jobs
WHERE id IN (SELECT entity_id FROM seed_manifest_40 WHERE entity_type = 'job');

DELETE FROM ideas
WHERE id IN (SELECT entity_id FROM seed_manifest_40 WHERE entity_type = 'idea');

DELETE FROM company_profiles
WHERE id IN (SELECT entity_id FROM seed_manifest_40 WHERE entity_type = 'company_profile');

DELETE FROM users
WHERE id IN (
    SELECT entity_id FROM seed_manifest_40 WHERE entity_type = 'company_user'
);

DROP TABLE seed_manifest_40;

COMMIT;
