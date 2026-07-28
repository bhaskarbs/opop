package com.openopportunity.idea;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IdeaInterestRepository extends JpaRepository<IdeaInterest, UUID> {

    boolean existsByIdeaIdAndInterestedUserId(UUID ideaId, UUID interestedUserId);

    List<IdeaInterest> findByIdeaIdOrderByCreatedAtDesc(UUID ideaId);

    List<IdeaInterest> findByInterestedUserIdOrderByCreatedAtDesc(UUID interestedUserId);

    /** Candidates in the "applied for partnership" funnel stage — both candidates and
     * companies can express interest in an idea (see SecurityConfig), so this joins to
     * users.role to count only CANDIDATE-role interests; a candidate interested in several
     * ideas still only counts once (see AdminDashboardService). */
    @Query(
            value = "select count(distinct i.interested_user_id) from idea_interests i "
                    + "join users u on u.id = i.interested_user_id where u.role = 'CANDIDATE'",
            nativeQuery = true)
    long countDistinctCandidateInterestedUsers();

    /** Raw idea_interests rows created in [start, end), any role — for the "Applications by
     * path" monthly chart (see AdminDashboardService), same broad definition as
     * partnershipMatches above. */
    long countByCreatedAtBetween(Instant start, Instant end);
}
