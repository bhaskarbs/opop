package com.openopportunity.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateCertificationRepository extends JpaRepository<CandidateCertification, UUID> {

    List<CandidateCertification> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    long countByCandidateId(UUID candidateId);

    Optional<CandidateCertification> findByIdAndCandidateId(UUID id, UUID candidateId);
}
