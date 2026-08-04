package com.openopportunity.search;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.IndexOperations;
import org.springframework.stereotype.Component;

/** Runs once at startup, only when app.search.provider=elasticsearch: creates the "jobs" index
 * with JobDocument's explicit mapping if it doesn't exist yet (rather than relying on
 * Elasticsearch's dynamic mapping, which would guess field types from whatever the first
 * indexed document happens to look like — status/experienceLevel/workMode specifically need to
 * be Keyword, not auto-detected Text, for exact-match filtering to work at all), then backfills
 * every job from Postgres if the index is empty. Covers both first-time local setup (an empty
 * Elasticsearch container has no mapping or documents yet) and a fresh Elastic Cloud deployment
 * the same way. Only ever an upsert (see JobIndexingService#reindexAll), so this is safe to run
 * on every restart. */
@Component
@ConditionalOnProperty(name = "app.search.provider", havingValue = "elasticsearch")
public class JobSearchIndexInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(JobSearchIndexInitializer.class);

    private final ElasticsearchOperations elasticsearchOperations;
    private final JobIndexingService jobIndexingService;

    public JobSearchIndexInitializer(
            ElasticsearchOperations elasticsearchOperations, JobIndexingService jobIndexingService) {
        this.elasticsearchOperations = elasticsearchOperations;
        this.jobIndexingService = jobIndexingService;
    }

    @Override
    public void run(ApplicationArguments args) {
        IndexOperations indexOps = elasticsearchOperations.indexOps(JobDocument.class);
        if (!indexOps.exists()) {
            indexOps.createWithMapping();
            log.info("Created the \"jobs\" Elasticsearch index with its mapping.");
        }
        if (jobIndexingService.count() == 0) {
            log.info("\"jobs\" Elasticsearch index is empty — backfilling from Postgres.");
            jobIndexingService.reindexAll();
        }
    }
}
