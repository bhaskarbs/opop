-- Full removal of the candidate email-verification feature (admin toggle + candidate gate) —
-- drops the tables/column added by V32, V33, V34.
drop table if exists email_verification_tokens;
drop table if exists platform_settings;
alter table users drop column if exists email_verified;
