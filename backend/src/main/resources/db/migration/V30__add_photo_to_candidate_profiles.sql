-- Served publicly (no auth) via CandidatePhotoController so <img> tags can reference it
-- directly without attaching a bearer token — upload itself still requires candidate auth (see
-- CandidateProfileController). Null until a photo is uploaded, same lazy-fill pattern as resume.
alter table candidate_profiles add column photo_storage_key varchar(500);
alter table candidate_profiles add column photo_content_type varchar(100);
