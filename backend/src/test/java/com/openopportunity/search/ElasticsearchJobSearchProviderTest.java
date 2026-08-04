package com.openopportunity.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Query;

@ExtendWith(MockitoExtension.class)
class ElasticsearchJobSearchProviderTest {

    @Mock
    private ElasticsearchOperations elasticsearchOperations;

    @Mock
    private SearchHits<JobDocument> searchHits;

    private ElasticsearchJobSearchProvider providerWithMock() {
        return new ElasticsearchJobSearchProvider(elasticsearchOperations);
    }

    @SuppressWarnings("unchecked")
    private void stubSearchToReturn(UUID... ids) {
        List<SearchHit<JobDocument>> hits = List.of(ids).stream()
                .<SearchHit<JobDocument>>map(id -> {
                    SearchHit<JobDocument> hit = org.mockito.Mockito.mock(SearchHit.class);
                    when(hit.getId()).thenReturn(id.toString());
                    return hit;
                })
                .toList();
        when(searchHits.stream()).thenAnswer(invocation -> hits.stream());
        when(elasticsearchOperations.search(any(Query.class), eq(JobDocument.class))).thenReturn(searchHits);
    }

    @Test
    void returnsIdsInTheOrderElasticsearchReturnsThem() {
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        stubSearchToReturn(first, second);

        List<UUID> ids = providerWithMock().searchIds(null, null, null, null, null, "relevant");

        assertThat(ids).containsExactly(first, second);
    }

    @Test
    void returnsAnEmptyListWhenNothingMatches() {
        stubSearchToReturn();

        List<UUID> ids = providerWithMock().searchIds(List.of("nonexistent"), null, null, null, null, "relevant");

        assertThat(ids).isEmpty();
    }

    @Test
    void queriesElasticsearchExactlyOncePerCall() {
        stubSearchToReturn();

        providerWithMock().searchIds(null, null, null, null, null, "newest");

        org.mockito.Mockito.verify(elasticsearchOperations).search(any(Query.class), eq(JobDocument.class));
    }
}
