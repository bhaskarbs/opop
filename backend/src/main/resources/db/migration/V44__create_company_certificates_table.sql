create table company_certificates (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references users(id) on delete cascade,
    storage_key varchar(500) not null,
    content_type varchar(100) not null,
    file_name varchar(255) not null,
    size_bytes bigint not null,
    uploaded_at timestamptz not null default now()
);

create index idx_company_certificates_company on company_certificates(company_id);

insert into company_certificates (company_id, storage_key, content_type, file_name, size_bytes, uploaded_at)
select user_id, certificate_storage_key, certificate_content_type, certificate_file_name, certificate_size_bytes, certificate_uploaded_at
from company_profiles
where certificate_storage_key is not null;

alter table company_profiles drop column certificate_storage_key;
alter table company_profiles drop column certificate_content_type;
alter table company_profiles drop column certificate_file_name;
alter table company_profiles drop column certificate_size_bytes;
alter table company_profiles drop column certificate_uploaded_at;
