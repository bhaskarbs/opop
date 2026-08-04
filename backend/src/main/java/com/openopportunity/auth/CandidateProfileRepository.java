package com.openopportunity.auth;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CandidateProfileRepository
        extends JpaRepository<CandidateProfile, UUID>, JpaSpecificationExecutor<CandidateProfile> {

    Optional<CandidateProfile> findByUserId(UUID userId);

    List<CandidateProfile> findByUserIdIn(Collection<UUID> userIds);

    long countByResumeStorageKeyIsNotNull();
}
