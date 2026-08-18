-- Admin-only display override for a single job posting (AdminPostJobPage) — lets an admin show a
-- different company name/logo on this posting than the owning account's real profile (e.g. an
-- agency or multi-brand employer posting under a different name), without touching the required
-- company_id ownership relationship the rest of the app depends on (applicants, notifications,
-- posting limits). All nullable: null means "use the owning company's own name/logo" (today's
-- behavior, unchanged for every existing row and every company-posted job).
alter table jobs add column display_company_name varchar(255);
alter table jobs add column logo_storage_key text;
alter table jobs add column logo_content_type varchar(100);
