package com.openopportunity.mockinterview;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockInterviewSessionRepository extends JpaRepository<MockInterviewSession, UUID> {

    List<MockInterviewSession> findByCandidateIdOrderByRecordedAtDesc(UUID candidateId);

    // Backs the admin listing of every recorded session across every candidate (see
    // MockInterviewService#adminGetAll) — the only query here with no candidateId filter at all.
    List<MockInterviewSession> findAllByOrderByRecordedAtDesc();

    // Backs the public share link (see MockInterviewShareAccessService) — the token alone, no
    // candidateId check, is deliberately all that's needed here.
    Optional<MockInterviewSession> findByShareToken(String shareToken);

    // Backs the company-facing view (CandidateSearchService#get / #getMockInterviewVideo) — only
    // sessions the candidate has explicitly opted in via MockInterviewService#updateVisibility.
    List<MockInterviewSession> findByCandidateIdAndVisibleToCompaniesTrueOrderByRecordedAtDesc(UUID candidateId);

    long countByCandidateId(UUID candidateId);

    long countByRecordedAtAfter(Instant since);

    // Used only by admin hard-delete (AdminAccountDeletionService#deleteCandidate) — the caller
    // must delete each session's video/thumbnail files (via FileStorageService) before calling
    // this, since it only removes the DB rows.
    void deleteByCandidateId(UUID candidateId);
}
