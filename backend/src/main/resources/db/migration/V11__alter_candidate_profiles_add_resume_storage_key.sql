-- resume_file_name (V9) is the original filename shown back to the candidate;
-- resume_storage_key is where FileStorageService actually put the uploaded bytes
-- (see com.openopportunity.storage) — null until a resume is actually uploaded.
alter table candidate_profiles add column resume_storage_key varchar(500);
