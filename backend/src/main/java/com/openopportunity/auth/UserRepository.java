package com.openopportunity.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {

    /** email is unique per role (see User), so a bare findByEmail/existsByEmail would be
     * ambiguous once the same address has both a candidate and a company account — every
     * caller must say which role it means. */
    Optional<User> findByEmailAndRole(String email, UserRole role);

    boolean existsByEmailAndRole(String email, UserRole role);
}
