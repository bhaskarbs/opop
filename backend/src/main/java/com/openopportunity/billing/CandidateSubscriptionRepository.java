package com.openopportunity.billing;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateSubscriptionRepository extends JpaRepository<CandidateSubscription, UUID> {

    Optional<CandidateSubscription> findByCandidateId(UUID candidateId);

    /** A null current_period_end (Free / never-subscribed) never satisfies "before cutoff" in
     * SQL, so this naturally only ever returns lapsed paid subscriptions. */
    List<CandidateSubscription> findByCurrentPeriodEndBeforeAndPlanNot(Instant cutoff, SubscriptionPlan plan);
}
