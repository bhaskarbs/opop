package com.openopportunity.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateWorkSampleRepository extends JpaRepository<CandidateWorkSample, UUID> {

    List<CandidateWorkSample> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    long countByCandidateId(UUID candidateId);

    Optional<CandidateWorkSample> findByIdAndCandidateId(UUID id, UUID candidateId);
}
