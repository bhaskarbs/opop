package com.openopportunity.idea.dto;

import com.openopportunity.idea.IdeaStage;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record IdeaRequest(
        @NotBlank String title,
        @NotBlank String category,
        @NotNull IdeaStage stage,
        @NotBlank String problem,
        @NotBlank String solution,
        @NotBlank String targetMarket,
        String funding,
        String equity,
        @Positive Integer teamSize,
        String timeline,
        String videoLink,
        @NotBlank @Email String contactEmail) {}
