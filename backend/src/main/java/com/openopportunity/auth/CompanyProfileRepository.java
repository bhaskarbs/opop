package com.openopportunity.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyProfileRepository extends JpaRepository<CompanyProfile, UUID> {

    Optional<CompanyProfile> findByUserId(UUID userId);

    List<CompanyProfile> findByVerificationStatusOrderByCreatedAtDesc(VerificationStatus status);
}
