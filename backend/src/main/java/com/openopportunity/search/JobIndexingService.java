package com.openopportunity.search;

import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.stereotype.Component;

/** Keeps the "jobs" Elasticsearch index in sync with the jobs table — Postgres stays the source
 * of truth (see JobDocument's javadoc); this only ever mirrors it. JobService calls
 * index()/delete() right after every jobRepository.save()/delete() once
 * app.search.provider=elasticsearch (see its private save()/delete() helpers) — best-effort,
 * synchronous, and not wrapped in the write's own transaction, so an indexing failure never
 * rolls back the actual Postgres write; the job just won't be searchable until the next
 * reindexAll(). */
@Component
@ConditionalOnProperty(name = "app.search.provider", havingValue = "elasticsearch")
public class JobIndexingService {

    private final ElasticsearchOperations elasticsearchOperations;
    private final JobRepository jobRepository;

    public JobIndexingService(ElasticsearchOperations elasticsearchOperations, JobRepository jobRepository) {
        this.elasticsearchOperations = elasticsearchOperations;
        this.jobRepository = jobRepository;
    }

    public void index(Job job) {
        elasticsearchOperations.save(JobDocument.from(job));
    }

    public void delete(UUID jobId) {
        elasticsearchOperations.delete(jobId.toString(), JobDocument.class);
    }

    /** Full rebuild from Postgres — run automatically once at startup if the index is empty (see
     * JobSearchIndexInitializer, which covers first-time local setup and a fresh Elastic Cloud
     * deployment alike), and safe to call again any time by restarting the app, e.g. after a
     * JobDocument mapping change. Every job gets indexed regardless of status, same as
     * PostgresJobSearchProvider querying the jobs table directly — visibility is a query-time
     * filter (status=ACTIVE), not something this needs to decide. */
    public void reindexAll() {
        List<JobDocument> documents =
                jobRepository.findAll().stream().map(JobDocument::from).toList();
        if (!documents.isEmpty()) {
            elasticsearchOperations.save(documents);
        }
    }

    public long count() {
        return elasticsearchOperations.count(Query.findAll(), JobDocument.class);
    }
}
