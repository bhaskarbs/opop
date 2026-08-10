package com.openopportunity.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateResearchPaperRepository extends JpaRepository<CandidateResearchPaper, UUID> {

    List<CandidateResearchPaper> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    long countByCandidateId(UUID candidateId);

    Optional<CandidateResearchPaper> findByIdAndCandidateId(UUID id, UUID candidateId);
}
