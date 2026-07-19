package com.openopportunity.mockinterview.dto;

import com.openopportunity.job.ExperienceLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** experienceLevel/industry are optional — a candidate may not have filled them into their
 * profile yet (see CandidateProfile). skills may also be empty; the caller falls back to its own
 * canned question bank in that case rather than calling this endpoint. */
public record GenerateQuestionsRequest(
        @NotNull List<String> skills,
        ExperienceLevel experienceLevel,
        String industry,
        @NotBlank String category,
        @Min(1) @Max(20) int count) {}
