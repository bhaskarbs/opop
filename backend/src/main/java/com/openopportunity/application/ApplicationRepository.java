package com.openopportunity.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    boolean existsByJobIdAndCandidateId(UUID jobId, UUID candidateId);

    Optional<Application> findByJobIdAndCandidateId(UUID jobId, UUID candidateId);

    List<Application> findByCandidateIdOrderByAppliedAtDesc(UUID candidateId);

    List<Application> findByJobIdOrderByAppliedAtDesc(UUID jobId);

    /** Candidates in the "applied to job" funnel stage — a candidate with several applications
     * still only counts once (see AdminDashboardService). */
    @Query("select count(distinct a.candidateId) from Application a")
    long countDistinctCandidates();
}
