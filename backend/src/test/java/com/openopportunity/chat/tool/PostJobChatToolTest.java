package com.openopportunity.chat.tool;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.anthropic.core.JsonValue;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobService;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PostJobChatToolTest {

    private final JobService jobService = mock(JobService.class);
    private final PostJobChatTool tool = new PostJobChatTool(jobService);

    private static Map<String, Object> baseInput() {
        return Map.of(
                "title", "Senior Backend Engineer",
                "employmentType", "FULL_TIME",
                "experienceLevel", "SENIOR",
                "workMode", "REMOTE",
                "location", "Bangalore",
                "aboutRole", "Own our payments platform.");
    }

    @Test
    void isOnlyAvailableToALoggedInCompany() {
        UUID companyId = UUID.randomUUID();
        assertThat(tool.isAvailableTo(companyId, "COMPANY")).isTrue();
        assertThat(tool.isAvailableTo(UUID.randomUUID(), "CANDIDATE")).isFalse();
        assertThat(tool.isAvailableTo(null, null)).isFalse();
    }

    @Test
    void previewsWithoutSubmittingWhenNotConfirmed() {
        UUID companyId = UUID.randomUUID();

        String result = tool.execute(companyId, JsonValue.from(baseInput()));

        assertThat(result).contains("Senior Backend Engineer");
        assertThat(result).contains("hasn't been submitted yet");
        verify(jobService, never()).create(any(), any());
    }

    @Test
    void submitsAsPendingApprovalWhenConfirmed() {
        UUID companyId = UUID.randomUUID();
        JobDetail created = new JobDetail(
                UUID.randomUUID(),
                "Senior Backend Engineer",
                "Acme",
                "Bangalore",
                WorkMode.REMOTE,
                ExperienceLevel.SENIOR,
                EmploymentType.FULL_TIME,
                null,
                null,
                null,
                null,
                null,
                "Own our payments platform.",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.PENDING_APPROVAL,
                0,
                Instant.now(),
                null,
                false,
                false);
        when(jobService.create(eq(companyId), any())).thenReturn(created);

        Map<String, Object> input = new java.util.HashMap<>(baseInput());
        input.put("confirmed", true);

        String result = tool.execute(companyId, JsonValue.from(input));

        assertThat(result).contains("Submitted!");
        assertThat(result).contains("pending admin approval");
        verify(jobService)
                .create(
                        eq(companyId),
                        eq(new JobRequest(
                                "Senior Backend Engineer",
                                EmploymentType.FULL_TIME,
                                ExperienceLevel.SENIOR,
                                WorkMode.REMOTE,
                                "Bangalore",
                                null,
                                null,
                                null,
                                null,
                                null,
                                "Own our payments platform.",
                                null,
                                null,
                                null,
                                JobStatus.PENDING_APPROVAL)));
    }

    @Test
    void rejectsAnInvalidEnumValue() {
        UUID companyId = UUID.randomUUID();
        Map<String, Object> input = new java.util.HashMap<>(baseInput());
        input.put("employmentType", "NOT_A_REAL_TYPE");

        assertThatThrownBy(() -> tool.execute(companyId, JsonValue.from(input)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
