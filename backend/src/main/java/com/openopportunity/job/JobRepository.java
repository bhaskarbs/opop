package com.openopportunity.job;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {

    List<Job> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

    long countByCompanyId(UUID companyId);

    long countByStatus(JobStatus status);

    List<Job> findByStatus(JobStatus status);

    long countByStatusAndCreatedAtAfter(JobStatus status, Instant since);

    List<Job> findByStatusAndCreatedAtAfter(JobStatus status, Instant since);
}
