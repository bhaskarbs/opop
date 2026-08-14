package com.openopportunity.auth;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    /** email is unique per role (see User), so a bare findByEmail/existsByEmail would be
     * ambiguous once the same address has both a candidate and a company account — every
     * caller must say which role it means. */
    Optional<User> findByEmailAndRole(String email, UserRole role);

    boolean existsByEmailAndRole(String email, UserRole role);

    long countByRole(UserRole role);

    long countByRoleAndCreatedAtAfter(UserRole role, Instant since);

    /** Exactly one admin exists in practice (see AdminSeeder — no self-registration flow), but
     * NotificationService.notifyAdmins fans out to every match rather than assuming that. */
    List<User> findByRole(UserRole role);
}
