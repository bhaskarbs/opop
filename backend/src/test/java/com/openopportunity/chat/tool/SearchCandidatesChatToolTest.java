package com.openopportunity.chat.tool;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.anthropic.core.JsonValue;
import com.openopportunity.auth.CandidateSearchService;
import com.openopportunity.auth.dto.CandidateSearchSummary;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SearchCandidatesChatToolTest {

    private final CandidateSearchService candidateSearchService = mock(CandidateSearchService.class);
    private final SearchCandidatesChatTool tool = new SearchCandidatesChatTool(candidateSearchService);

    @Test
    void isOnlyAvailableToALoggedInCompany() {
        UUID companyId = UUID.randomUUID();
        assertThat(tool.isAvailableTo(companyId, "COMPANY")).isTrue();
        assertThat(tool.isAvailableTo(UUID.randomUUID(), "CANDIDATE")).isFalse();
        assertThat(tool.isAvailableTo(null, null)).isFalse();
    }

    @Test
    void parsesInputAndDelegatesToCandidateSearchServiceSearch() {
        UUID companyId = UUID.randomUUID();
        when(candidateSearchService.search(companyId, "React developer", List.of("Mumbai"), "relevant"))
                .thenReturn(List.of());

        JsonValue input = JsonValue.from(Map.of("query", "React developer", "locations", List.of("Mumbai")));

        tool.execute(companyId, input);

        verify(candidateSearchService).search(companyId, "React developer", List.of("Mumbai"), "relevant");
    }

    @Test
    void summarizesMatchingCandidatesWithoutContactDetails() {
        UUID companyId = UUID.randomUUID();
        CandidateSearchSummary candidate = new CandidateSearchSummary(
                UUID.randomUUID(), "Jane Doe", "Backend Engineer", "Mumbai", List.of("Java", "Spring"), null, false, false);
        when(candidateSearchService.search(eq(companyId), any(), any(), any()))
                .thenReturn(List.of(candidate));

        String summary = tool.execute(companyId, JsonValue.from(Map.of()));

        assertThat(summary).contains("Jane Doe");
        assertThat(summary).contains("Backend Engineer");
        assertThat(summary).contains("Java, Spring");
        assertThat(summary).doesNotContain("null");
    }

    @Test
    void returnsANoMatchesMessageWhenNothingMatched() {
        UUID companyId = UUID.randomUUID();
        when(candidateSearchService.search(eq(companyId), any(), any(), any()))
                .thenReturn(List.of());

        String summary = tool.execute(companyId, JsonValue.from(Map.of()));

        assertThat(summary).isEqualTo("No candidates matched that search.");
    }
}
