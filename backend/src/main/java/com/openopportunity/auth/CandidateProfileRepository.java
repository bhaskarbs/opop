package com.openopportunity.auth;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateProfileRepository extends JpaRepository<CandidateProfile, UUID> {

    Optional<CandidateProfile> findByUserId(UUID userId);

    List<CandidateProfile> findByUserIdIn(Collection<UUID> userIds);
}
