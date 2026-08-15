package com.openopportunity.mockinterview.dto;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.QuestionDifficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** industry/experienceLevels/difficulty are all optional, same treatment as on the AI-generated
 * path (see MockInterviewQuestionService) — an admin may add a general question with none of
 * them set. An empty experienceLevels list means "applies to any experience level". */
public record CreateMockInterviewQuestionRequest(
        @NotBlank String text,
        @NotNull List<String> skills,
        String industry,
        @NotNull List<ExperienceLevel> experienceLevels,
        QuestionDifficulty difficulty) {}
