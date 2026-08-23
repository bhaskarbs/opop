package com.openopportunity.job;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {

    List<Job> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    long countByCompanyId(UUID companyId);

    long countByStatus(JobStatus status);

    List<Job> findByStatus(JobStatus status);

    long countByStatusAndCreatedAtAfter(JobStatus status, Instant since);

    List<Job> findByStatusAndCreatedAtAfter(JobStatus status, Instant since);

    /** Backdates an already-persisted job's "posted" date — see
     * JobService#adminUpdatePostedAt. createdAt is {@code @Column(updatable = false)} on Job,
     * so Hibernate's normal dirty-checking-based UPDATE deliberately never includes it; this
     * bypasses that via a direct JPQL update instead of the entity setter. {@code
     * clearAutomatically = true} evicts the persistence context afterward so a subsequent
     * findById in the same transaction re-reads the new value instead of returning the
     * (now stale) cached entity. */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Job j SET j.createdAt = :createdAt WHERE j.id = :id")
    int updateCreatedAt(@Param("id") UUID id, @Param("createdAt") Instant createdAt);
}
