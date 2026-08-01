package com.openopportunity.auth;

/** Only meaningful when {@link User#getRole()} is {@link UserRole#ADMIN} — null for
 * candidates/companies. Every level can access approvals and user management; ADMIN and
 * SUPER_ADMIN additionally get the dashboard, reports, billing, and mock interview question
 * bank; only SUPER_ADMIN can create or delete other admin-tier accounts (see AdminTeamService).
 * Ordered from least to most privileged — not enforced by ordinal anywhere, just readability. */
public enum AdminLevel {
    REVIEWER,
    ADMIN,
    SUPER_ADMIN
}
