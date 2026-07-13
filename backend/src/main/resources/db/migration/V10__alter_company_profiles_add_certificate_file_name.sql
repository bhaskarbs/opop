-- Captures the certificate-of-incorporation filename from company registration. Like
-- candidate_profiles.resume_file_name, this is metadata only — no object-storage service
-- exists yet to hold the actual file content.
alter table company_profiles add column certificate_file_name varchar(255);
