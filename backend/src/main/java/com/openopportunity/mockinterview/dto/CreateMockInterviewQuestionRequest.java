package com.openopportunity.mockinterview.dto;

import com.openopportunity.job.ExperienceLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** industry/experienceLevel are optional, same treatment as on the AI-generated path (see
 * MockInterviewQuestionService) — an admin may add a general question with neither set. */
public record CreateMockInterviewQuestionRequest(
        @NotBlank String text,
        @NotBlank String category,
        @NotNull List<String> skills,
        String industry,
        ExperienceLevel experienceLevel) {}
