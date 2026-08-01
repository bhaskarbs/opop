alter table company_profiles add column certificate_storage_key varchar(500);
alter table company_profiles add column certificate_content_type varchar(100);
alter table company_profiles add column certificate_size_bytes bigint;
alter table company_profiles add column certificate_uploaded_at timestamptz;
