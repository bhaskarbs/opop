package com.openopportunity.savedjob;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedJobRepository extends JpaRepository<SavedJob, UUID> {

    List<SavedJob> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    boolean existsByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    void deleteByCandidateIdAndJobId(UUID candidateId, UUID jobId);
}
