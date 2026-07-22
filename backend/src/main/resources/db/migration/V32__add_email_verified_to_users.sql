-- Backfills existing accounts as verified (true) so nobody already registered gets locked out
-- retroactively — only new CANDIDATE email/password registrations start unverified from here on
-- (see AuthService.register / User.markEmailUnverified).
alter table users add column email_verified boolean not null default true;
