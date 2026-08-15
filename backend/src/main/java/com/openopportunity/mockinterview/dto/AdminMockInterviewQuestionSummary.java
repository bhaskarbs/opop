package com.openopportunity.mockinterview.dto;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.QuestionDifficulty;
import com.openopportunity.mockinterview.QuestionSource;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AdminMockInterviewQuestionSummary(
        UUID id,
        String text,
        List<String> skills,
        String industry,
        List<ExperienceLevel> experienceLevels,
        QuestionDifficulty difficulty,
        boolean important,
        QuestionSource source,
        Instant createdAt) {}
