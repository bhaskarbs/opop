-- Email used to be globally unique across every role, so the same person couldn't hold both
-- a candidate account and a company account (e.g. a recruiter's personal Gmail that's also
-- their own job-seeking account) — see AuthService.login/register/loginWithGoogle*, which are
-- now role-aware to match. Scoping uniqueness to (email, role) instead keeps each login
-- context (candidate vs. company vs. admin) internally unique without that cross-role
-- restriction.
alter table users drop constraint users_email_key;
alter table users add constraint users_email_role_key unique (email, role);
