package com.openopportunity.auth;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CandidateContactRevealRepository extends JpaRepository<CandidateContactReveal, UUID> {

    boolean existsByCompanyIdAndCandidateId(UUID companyId, UUID candidateId);

    // Fetched once per search() call and checked in memory against each result — avoids one
    // query per candidate card.
    List<CandidateContactReveal> findByCompanyId(UUID companyId);

    // Backs the contact-reveal quota (see CandidateSearchService.getContactQuota) — counts
    // reveals made since the current billing period started, not the company's all-time total.
    long countByCompanyIdAndRevealedAtAfter(UUID companyId, Instant after);
}
