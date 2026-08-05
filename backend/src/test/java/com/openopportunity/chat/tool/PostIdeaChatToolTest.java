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
import com.openopportunity.auth.UserRole;
import com.openopportunity.idea.IdeaService;
import com.openopportunity.idea.IdeaStage;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaRequest;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PostIdeaChatToolTest {

    private final IdeaService ideaService = mock(IdeaService.class);
    private final PostIdeaChatTool tool = new PostIdeaChatTool(ideaService);

    private static Map<String, Object> baseInput() {
        return Map.of(
                "title", "AI resume coach",
                "category", "EdTech",
                "stage", "CONCEPT",
                "problem", "Job seekers don't know how to write a strong resume.",
                "solution", "An AI assistant that rewrites resumes to match a job description.",
                "targetMarket", "Early-career job seekers",
                "contactEmail", "founder@example.com");
    }

    @Test
    void isAvailableToLoggedInCandidatesAndCompaniesOnly() {
        assertThat(tool.isAvailableTo(UUID.randomUUID(), "CANDIDATE")).isTrue();
        assertThat(tool.isAvailableTo(UUID.randomUUID(), "COMPANY")).isTrue();
        assertThat(tool.isAvailableTo(null, null)).isFalse();
    }

    @Test
    void previewsWithoutSubmittingWhenNotConfirmed() {
        UUID userId = UUID.randomUUID();

        String result = tool.execute(userId, JsonValue.from(baseInput()));

        assertThat(result).contains("AI resume coach");
        assertThat(result).contains("hasn't been submitted yet");
        verify(ideaService, never()).create(any(), any());
    }

    @Test
    void submitsWhenConfirmed() {
        UUID userId = UUID.randomUUID();
        IdeaDetail created = new IdeaDetail(
                UUID.randomUUID(),
                "Jane Doe",
                UserRole.CANDIDATE,
                "AI resume coach",
                "EdTech",
                IdeaStage.CONCEPT,
                "Job seekers don't know how to write a strong resume.",
                "An AI assistant that rewrites resumes to match a job description.",
                "Early-career job seekers",
                null,
                null,
                null,
                null,
                null,
                "founder@example.com",
                IdeaStatus.PENDING,
                false,
                0,
                Instant.now());
        when(ideaService.create(eq(userId), any())).thenReturn(created);

        Map<String, Object> input = new HashMap<>(baseInput());
        input.put("confirmed", true);

        String result = tool.execute(userId, JsonValue.from(input));

        assertThat(result).contains("Submitted!");
        verify(ideaService)
                .create(
                        eq(userId),
                        eq(new IdeaRequest(
                                "AI resume coach",
                                "EdTech",
                                IdeaStage.CONCEPT,
                                "Job seekers don't know how to write a strong resume.",
                                "An AI assistant that rewrites resumes to match a job description.",
                                "Early-career job seekers",
                                null,
                                null,
                                null,
                                null,
                                null,
                                "founder@example.com")));
    }

    @Test
    void rejectsAnInvalidStage() {
        UUID userId = UUID.randomUUID();
        Map<String, Object> input = new HashMap<>(baseInput());
        input.put("stage", "NOT_A_REAL_STAGE");

        assertThatThrownBy(() -> tool.execute(userId, JsonValue.from(input)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
