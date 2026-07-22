package com.openopportunity.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    // Used to revoke every active session on a password reset — see AuthService.resetPassword.
    List<RefreshToken> findByUserIdAndRevokedAtIsNull(UUID userId);
}
