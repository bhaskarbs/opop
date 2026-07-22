-- Singleton row (id is always 1) holding platform-wide toggles an admin can flip live from the
-- admin console — see com.openopportunity.settings. Starts with every toggle "on" so behavior is
-- unchanged out of the box until an admin explicitly turns something off.
create table platform_settings (
    id smallint primary key,
    email_verification_enabled boolean not null default true
);

insert into platform_settings (id, email_verification_enabled) values (1, true);
