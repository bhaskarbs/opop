-- All nullable (languages defaults to empty, matching skills' invariant of always being a
-- non-null array rather than null) — none of these is collected at registration, same
-- treatment as every other CandidateProfilePage field added since V12.
alter table candidate_profiles
    add column gender varchar(20)
        check (gender in ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
    add column marital_status varchar(20)
        check (marital_status in ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY')),
    add column date_of_birth date,
    add column address text,
    add column languages text[] not null default '{}';
