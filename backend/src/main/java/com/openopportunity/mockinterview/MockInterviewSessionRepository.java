package com.openopportunity.mockinterview;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockInterviewSessionRepository extends JpaRepository<MockInterviewSession, UUID> {

    List<MockInterviewSession> findByCandidateIdOrderByRecordedAtDesc(UUID candidateId);

    long countByCandidateId(UUID candidateId);

    // Used only by admin hard-delete (AdminAccountDeletionService#deleteCandidate) — the caller
    // must delete each session's video/thumbnail files (via FileStorageService) before calling
    // this, since it only removes the DB rows.
    void deleteByCandidateId(UUID candidateId);
}
