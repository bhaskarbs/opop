package com.openopportunity.search;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.WorkMode;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Finds every ACTIVE job matching the public search bar's filters, abstracted from where the
 * matching/ranking actually happens — {@link PostgresJobSearchProvider} (the local-first
 * default, querying the jobs table directly) or {@link ElasticsearchJobSearchProvider} (once
 * app.search.provider=elasticsearch, backed by Elasticsearch locally in Docker and Elastic Cloud
 * in a real deployment). JobService.search() does the featured/promoted-company ranking pass and
 * pagination on top of whichever list this returns, and re-hydrates full Job entities from
 * JobRepository by id — this only ever returns ids, never anything used to build a response
 * directly, so Postgres stays the one source of truth either way.
 */
public interface JobSearchProvider {

    /** Every matching ACTIVE job's id, already ordered per {@code sort} ("relevant", "newest", or
     * "salary" — see JobService#resolveSort/ElasticsearchJobSearchProvider's own handling of the
     * same three values). Unpaginated — same "rank the whole matching set, then slice" design
     * JobService.search() already had before this abstraction existed. */
    List<UUID> searchIds(
            List<String> keywords,
            List<String> locations,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort);
}
