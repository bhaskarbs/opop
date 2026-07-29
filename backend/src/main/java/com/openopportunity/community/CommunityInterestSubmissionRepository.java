package com.openopportunity.community;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityInterestSubmissionRepository
        extends JpaRepository<CommunityInterestSubmission, UUID> {

    /** Raw submissions created in [start, end) — for the "Applications by path" monthly chart
     * (see AdminDashboardService), same broad definition as communitySignUps above. */
    long countByCreatedAtBetween(Instant start, Instant end);

    /** Newest first — for the admin reports Community tab (see AdminReportsService). */
    List<CommunityInterestSubmission> findAllByOrderByCreatedAtDesc();
}
