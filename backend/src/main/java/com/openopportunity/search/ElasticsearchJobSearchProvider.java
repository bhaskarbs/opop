package com.openopportunity.search;

import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Sort;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.client.elc.NativeQueryBuilder;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Component;

/** Queries the "jobs" Elasticsearch index (see JobDocument/JobIndexingService) instead of
 * Postgres directly — same filters as PostgresJobSearchProvider, but "relevant" (the default
 * sort) becomes a real BM25 relevance ranking across title/companyName/skills instead of falling
 * back to recency, which is the actual reason to prefer this over Postgres at all.
 *
 * <p>Built directly against the Elastic Java API client's query DSL ({@code co.elastic.clients})
 * rather than Spring Data Elasticsearch's higher-level {@code Criteria} API — {@code Criteria}
 * turned out not to properly group an OR'd sub-expression (e.g. "title OR companyName OR
 * skills") inside a larger AND chain; every value past the first OR branch silently vanished
 * from the translated query. The native bool/must/filter/should structure below has no such
 * ambiguity.
 */
@Component
@ConditionalOnProperty(name = "app.search.provider", havingValue = "elasticsearch")
public class ElasticsearchJobSearchProvider implements JobSearchProvider {

    // JobService.search() ranks and paginates the *entire* matching set in Java (same design
    // PostgresJobSearchProvider inherited from before this abstraction existed) — this just
    // needs to be a generous cap on top of that, not a real page size. Elasticsearch's own
    // default (10) would silently truncate any search with more matches than that.
    private static final int MAX_RESULTS = 1000;

    private final ElasticsearchOperations elasticsearchOperations;

    public ElasticsearchJobSearchProvider(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    @Override
    public List<UUID> searchIds(
            List<String> keywords,
            List<String> locations,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort) {
        BoolQuery.Builder bool = new BoolQuery.Builder();
        // filter: contributes to matching but never to relevance scoring — exactly right for
        // pure yes/no facets, unlike the keyword/location text matches below.
        bool.filter(term("status", JobStatus.ACTIVE.name()));
        if (levels != null && !levels.isEmpty()) {
            bool.filter(terms("experienceLevel", levels.stream().map(Enum::name).toList()));
        }
        if (modes != null && !modes.isEmpty()) {
            bool.filter(terms("workMode", modes.stream().map(Enum::name).toList()));
        }
        if (minSalaryLakhs != null) {
            bool.filter(Query.of(q -> q.range(r -> r.number(
                    n -> n.field("salaryMaxLakhs").gte(minSalaryLakhs.doubleValue())))));
        }

        // must (not filter): these two *do* contribute to relevance scoring — the entire reason
        // "relevant" sort is worth having over Postgres's recency-only fallback.
        Query keywordQuery = matchAnyFieldAnyValue(List.of("title", "companyName", "skills"), keywords);
        if (keywordQuery != null) {
            bool.must(keywordQuery);
        }
        Query locationQuery = matchAnyFieldAnyValue(List.of("locations"), locations);
        if (locationQuery != null) {
            bool.must(locationQuery);
        }

        NativeQueryBuilder queryBuilder =
                NativeQuery.builder().withQuery(q -> q.bool(bool.build())).withMaxResults(MAX_RESULTS);
        applySort(queryBuilder, sort);

        SearchHits<JobDocument> hits = elasticsearchOperations.search(queryBuilder.build(), JobDocument.class);
        return hits.stream().map(hit -> UUID.fromString(hit.getId())).toList();
    }

    /** "ANY of these values matches ANY of these fields" — mirrors
     * JobSpecifications.matchesAnyKeyword/matchesAnyLocation's semantics, built as a nested
     * bool/should (Elasticsearch's OR) with minimum_should_match=1. Returns null (no-op) when
     * there's nothing to filter on. */
    private Query matchAnyFieldAnyValue(List<String> fields, List<String> values) {
        List<String> normalized = normalize(values);
        if (normalized.isEmpty()) {
            return null;
        }
        List<Query> clauses = new ArrayList<>();
        for (String value : normalized) {
            for (String field : fields) {
                clauses.add(Query.of(q -> q.match(m -> m.field(field).query(value))));
            }
        }
        return Query.of(q -> q.bool(b -> b.should(clauses).minimumShouldMatch("1")));
    }

    private static Query term(String field, String value) {
        return Query.of(q -> q.term(t -> t.field(field).value(value)));
    }

    private static Query terms(String field, List<String> values) {
        List<FieldValue> fieldValues = values.stream().map(FieldValue::of).toList();
        return Query.of(q -> q.terms(t -> t.field(field).terms(tf -> tf.value(fieldValues))));
    }

    private void applySort(NativeQueryBuilder queryBuilder, String sort) {
        if ("salary".equals(sort)) {
            queryBuilder.withSort(Sort.by(Sort.Direction.DESC, "salaryMaxLakhs"));
        } else if ("newest".equals(sort)) {
            queryBuilder.withSort(Sort.by(Sort.Direction.DESC, "createdAt"));
        }
        // "relevant" (the default): no explicit sort — leave Elasticsearch's natural _score
        // ordering in place, the whole reason to prefer this provider over Postgres's.
    }

    private static List<String> normalize(List<String> values) {
        if (values == null || values.isEmpty()) {
            return List.of();
        }
        return values.stream().filter(value -> value != null && !value.isBlank()).map(String::trim).toList();
    }
}
