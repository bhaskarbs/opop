package com.openopportunity.savedjob;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedJobRepository extends JpaRepository<SavedJob, UUID> {

    List<SavedJob> findByCandidateIdOrderByCreatedAtDesc(UUID candidateId);

    boolean existsByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    void deleteByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    // Both used only by admin hard-delete (JobService#adminDelete, AdminAccountDeletionService)
    // — saved_jobs has no DB-level FK to jobs/users, so this cleanup is entirely
    // application-managed.
    void deleteByJobId(UUID jobId);

    void deleteByCandidateId(UUID candidateId);
}
