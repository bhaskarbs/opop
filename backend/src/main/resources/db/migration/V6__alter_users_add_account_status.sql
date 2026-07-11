alter table users
    add column account_status varchar(10) not null default 'ACTIVE'
        check (account_status in ('ACTIVE', 'SUSPENDED'));
