-- Splits the single ADMIN role into three tiers (see AdminLevel) — reviewer (approvals + user
-- management only), admin (everything except managing other admin-tier accounts), and
-- super_admin (everything, including creating/deleting reviewer and admin accounts). Nullable
-- since it's meaningless for CANDIDATE/COMPANY rows; every existing ADMIN row is backfilled to
-- super_admin so today's one seeded admin doesn't lose any capability.
alter table users add column admin_level varchar(20)
    check (admin_level in ('REVIEWER', 'ADMIN', 'SUPER_ADMIN'));

update users set admin_level = 'SUPER_ADMIN' where role = 'ADMIN';
