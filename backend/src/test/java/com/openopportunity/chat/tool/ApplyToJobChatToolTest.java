package com.openopportunity.chat.tool;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.anthropic.core.JsonValue;
import com.openopportunity.application.ApplicationService;
import com.openopportunity.application.ApplicationStatus;
import com.openopportunity.application.dto.ApplicationSummary;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobService;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobDetail;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ApplyToJobChatToolTest {

    private final ApplicationService applicationService = mock(ApplicationService.class);
    private final JobService jobService = mock(JobService.class);
    private final ApplyToJobChatTool tool = new ApplyToJobChatTool(applicationService, jobService);

    private static JobDetail job(UUID id) {
        return new JobDetail(
                id,
                "Senior Backend Engineer",
                "Acme",
                "Bangalore",
                WorkMode.REMOTE,
                ExperienceLevel.SENIOR,
                EmploymentType.FULL_TIME,
                null,
                null,
                null,
                "Own our payments platform.",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE,
                0,
                Instant.now(),
                null,
                false,
                false);
    }

    @Test
    void isOnlyAvailableToALoggedInCandidate() {
        UUID candidateId = UUID.randomUUID();
        assertThat(tool.isAvailableTo(candidateId, "CANDIDATE")).isTrue();
        assertThat(tool.isAvailableTo(UUID.randomUUID(), "COMPANY")).isFalse();
        assertThat(tool.isAvailableTo(null, null)).isFalse();
    }

    @Test
    void previewsWithoutApplyingWhenNotConfirmed() {
        UUID candidateId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(jobService.get(jobId, candidateId)).thenReturn(job(jobId));

        String result = tool.execute(candidateId, JsonValue.from(Map.of("jobId", jobId.toString())));

        assertThat(result).contains("Senior Backend Engineer");
        assertThat(result).contains("hasn't been submitted yet");
        verify(applicationService, never()).apply(any(), any());
    }

    @Test
    void appliesWhenConfirmed() {
        UUID candidateId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        when(jobService.get(jobId, candidateId)).thenReturn(job(jobId));
        when(applicationService.apply(candidateId, jobId))
                .thenReturn(new ApplicationSummary(
                        UUID.randomUUID(),
                        jobId,
                        "Senior Backend Engineer",
                        "Acme",
                        ApplicationStatus.APPLIED,
                        Instant.now()));

        String result = tool.execute(
                candidateId, JsonValue.from(Map.of("jobId", jobId.toString(), "confirmed", true)));

        assertThat(result).contains("Applied!");
        verify(applicationService).apply(candidateId, jobId);
    }

    @Test
    void rejectsAnInvalidJobId() {
        UUID candidateId = UUID.randomUUID();

        assertThatThrownBy(() -> tool.execute(candidateId, JsonValue.from(Map.of("jobId", "not-a-uuid"))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
