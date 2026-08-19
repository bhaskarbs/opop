package com.openopportunity.chat.tool;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.anthropic.core.JsonValue;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobService;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobSearchResult;
import com.openopportunity.job.dto.JobSummary;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SearchJobsChatToolTest {

    private final JobService jobService = mock(JobService.class);
    private final SearchJobsChatTool tool = new SearchJobsChatTool(jobService, "http://localhost:5173");

    @Test
    void isAvailableToEveryoneIncludingAnonymousCallers() {
        assertThat(tool.isAvailableTo(null, null)).isTrue();
        assertThat(tool.isAvailableTo(UUID.randomUUID(), "CANDIDATE")).isTrue();
    }

    @Test
    void parsesInputAndDelegatesToJobServiceSearch() {
        when(jobService.search(any(), any(), any(), any(), any(), eq("relevant"), eq(0), eq(5)))
                .thenReturn(new JobSearchResult(List.of(), 0, 5, 0, 0));

        JsonValue input = JsonValue.from(Map.of(
                "keywords", List.of("React"),
                "locations", List.of("Bangalore"),
                "experienceLevels", List.of("SENIOR"),
                "workModes", List.of("REMOTE"),
                "minSalaryLakhs", 15));

        tool.execute(null, input);

        verify(jobService)
                .search(
                        eq(List.of("React")),
                        eq(List.of("Bangalore")),
                        eq(List.of(ExperienceLevel.SENIOR)),
                        eq(List.of(WorkMode.REMOTE)),
                        eq(BigDecimal.valueOf(15)),
                        eq("relevant"),
                        eq(0),
                        eq(5));
    }

    @Test
    void summarizesMatchingJobsWithLinks() {
        JobSummary job = new JobSummary(
                UUID.randomUUID(),
                "Senior Backend Engineer",
                "Acme",
                "Remote",
                WorkMode.REMOTE,
                ExperienceLevel.SENIOR,
                EmploymentType.FULL_TIME,
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(15),
                null,
                null,
                List.of("Java"),
                com.openopportunity.job.JobStatus.ACTIVE,
                0,
                Instant.now(),
                null,
                false,
                false);
        when(jobService.search(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new JobSearchResult(List.of(job), 0, 5, 1, 1));

        String summary = tool.execute(null, JsonValue.from(Map.of()));

        assertThat(summary).contains("Senior Backend Engineer");
        assertThat(summary).contains("Acme");
        assertThat(summary).contains("10-15 LPA");
        assertThat(summary).contains("http://localhost:5173/en/jobs/" + job.id());
    }

    @Test
    void returnsANoMatchesMessageWhenNothingMatched() {
        when(jobService.search(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new JobSearchResult(List.of(), 0, 5, 0, 0));

        String summary = tool.execute(null, JsonValue.from(Map.of()));

        assertThat(summary).isEqualTo("No jobs matched that search.");
    }

    @Test
    void ignoresAnUnrecognizedEnumValueRatherThanFailing() {
        when(jobService.search(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
                .thenReturn(new JobSearchResult(List.of(), 0, 5, 0, 0));

        JsonValue input = JsonValue.from(Map.of("experienceLevels", List.of("NOT_A_REAL_LEVEL")));

        tool.execute(null, input);

        verify(jobService).search(any(), any(), eq(List.of()), any(), any(), any(), anyInt(), anyInt());
    }
}
