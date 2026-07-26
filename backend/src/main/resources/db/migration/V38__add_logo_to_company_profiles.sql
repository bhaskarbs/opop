-- Served publicly (no auth) via CompanyLogoController so an <img> tag can reference it directly
-- without attaching a bearer token — upload itself still requires company auth (see
-- CompanyProfileController). Null until a logo is uploaded. Mirrors candidate_profiles'
-- photo_storage_key/photo_content_type (see V30).
alter table company_profiles add column logo_storage_key varchar(500);
alter table company_profiles add column logo_content_type varchar(100);
