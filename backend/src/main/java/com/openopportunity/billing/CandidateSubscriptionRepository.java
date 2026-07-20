package com.openopportunity.billing;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateSubscriptionRepository extends JpaRepository<CandidateSubscription, UUID> {

    Optional<CandidateSubscription> findByCandidateId(UUID candidateId);
}
