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
import com.openopportunity.idea.IdeaInterestRole;
import com.openopportunity.idea.IdeaService;
import com.openopportunity.idea.IdeaStage;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaInterestRequest;
import com.openopportunity.idea.dto.IdeaInterestSummary;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ExpressInterestInIdeaChatToolTest {

    private final IdeaService ideaService = mock(IdeaService.class);
    private final ExpressInterestInIdeaChatTool tool = new ExpressInterestInIdeaChatTool(ideaService);

    private static IdeaDetail idea(UUID id) {
        return new IdeaDetail(
                id,
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
                IdeaStatus.APPROVED,
                false,
                0,
                Instant.now());
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
        UUID ideaId = UUID.randomUUID();
        when(ideaService.get(ideaId, userId)).thenReturn(idea(ideaId));

        String result = tool.execute(
                userId, JsonValue.from(Map.of("ideaId", ideaId.toString(), "role", "INVESTOR")));

        assertThat(result).contains("AI resume coach");
        assertThat(result).contains("hasn't been submitted yet");
        verify(ideaService, never()).submitInterest(any(), any(), any());
    }

    @Test
    void submitsWhenConfirmed() {
        UUID userId = UUID.randomUUID();
        UUID ideaId = UUID.randomUUID();
        when(ideaService.get(ideaId, userId)).thenReturn(idea(ideaId));
        when(ideaService.submitInterest(
                        eq(ideaId), eq(userId), any()))
                .thenReturn(new IdeaInterestSummary(
                        UUID.randomUUID(),
                        "John Smith",
                        IdeaInterestRole.INVESTOR,
                        "10L",
                        "Interested!",
                        null,
                        null,
                        Instant.now()));

        String result = tool.execute(
                userId,
                JsonValue.from(Map.of(
                        "ideaId", ideaId.toString(), "role", "INVESTOR", "ticketSize", "10L", "confirmed", true)));

        assertThat(result).contains("Submitted!");
        verify(ideaService)
                .submitInterest(ideaId, userId, new IdeaInterestRequest(IdeaInterestRole.INVESTOR, "10L", null));
    }

    @Test
    void rejectsAnInvalidRole() {
        UUID userId = UUID.randomUUID();
        UUID ideaId = UUID.randomUUID();
        when(ideaService.get(ideaId, userId)).thenReturn(idea(ideaId));

        assertThatThrownBy(() -> tool.execute(
                        userId, JsonValue.from(Map.of("ideaId", ideaId.toString(), "role", "NOT_A_REAL_ROLE"))))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
