package com.openopportunity.jobalert;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobAlertRepository extends JpaRepository<JobAlert, UUID> {

    List<JobAlert> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    Optional<JobAlert> findByIdAndCandidateId(UUID id, UUID candidateId);

    long countByCandidateId(UUID candidateId);
}
