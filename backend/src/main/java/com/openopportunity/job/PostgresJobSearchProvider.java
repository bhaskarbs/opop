package com.openopportunity.job;

import com.openopportunity.search.JobSearchProvider;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

/** The local-first default — queries the jobs table directly via JobSpecifications, exactly the
 * logic JobService.search() used before JobSearchProvider existed. Lives in this package (not
 * com.openopportunity.search, where the interface and the Elasticsearch implementation live)
 * because JobSpecifications is deliberately package-private. */
@Component
@ConditionalOnProperty(name = "app.search.provider", havingValue = "postgres", matchIfMissing = true)
public class PostgresJobSearchProvider implements JobSearchProvider {

    private final JobRepository jobRepository;

    public PostgresJobSearchProvider(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @Override
    public List<UUID> searchIds(
            List<String> keywords,
            List<String> locations,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.ACTIVE),
                JobSpecifications.matchesAnyKeyword(keywords),
                JobSpecifications.matchesAnyLocation(locations),
                JobSpecifications.hasLevelIn(levels),
                JobSpecifications.hasModeIn(modes),
                JobSpecifications.hasMinSalaryAtLeast(minSalaryLakhs));
        return jobRepository.findAll(spec, resolveSort(sort)).stream().map(Job::getId).toList();
    }

    private Sort resolveSort(String sort) {
        if ("salary".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "salaryMaxLakhs");
        }
        // "newest" and the default ("relevant" — Postgres has no relevance ranking model, unlike
        // ElasticsearchJobSearchProvider) both fall back to recency.
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }
}
