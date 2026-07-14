-- mobile_verified backs AddMissingDetailsPage's "mobile verification" checklist item — there's
-- no real OTP/SMS provider wired up, so "verified" just means the candidate went through the
-- (currently cosmetic) verify flow, not that the number was actually confirmed via SMS.
alter table candidate_profiles
    add column mobile_verified boolean not null default false,
    add column work_mode_preference varchar(50),
    add column open_to_preference varchar(100);
