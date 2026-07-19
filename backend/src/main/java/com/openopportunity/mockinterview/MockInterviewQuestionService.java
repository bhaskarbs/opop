package com.openopportunity.mockinterview;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.exception.QuestionGenerationUnavailableException;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

/** Generates mock-interview questions with the Claude API, tailored to the candidate's selected
 * skills, experience level, and industry for this session. Requires ANTHROPIC_API_KEY to be set
 * in the environment the backend runs in (never hardcoded — see application.properties' MAIL_*
 * handling for the same pattern); when it's absent, or the call fails for any reason, this throws
 * QuestionGenerationUnavailableException and MockInterviewController lets that surface as a 502
 * so the frontend can fall back to its own local question generator. */
@Service
public class MockInterviewQuestionService {

    record QuestionList(
            @JsonPropertyDescription(
                            "The generated interview questions, each a single self-contained sentence with no numbering or preamble.")
                    List<String> questions) {}

    private final AnthropicClient client;

    public MockInterviewQuestionService() {
        AnthropicClient created;
        try {
            created = AnthropicOkHttpClient.fromEnv();
        } catch (RuntimeException ex) {
            created = null;
        }
        this.client = created;
    }

    public List<String> generateQuestions(
            List<String> skills, ExperienceLevel experienceLevel, String industry, String category, int count) {
        if (client == null) {
            throw new QuestionGenerationUnavailableException();
        }
        try {
            StructuredMessageCreateParams<QuestionList> params = MessageCreateParams.builder()
                    .model(Model.CLAUDE_OPUS_4_8)
                    .maxTokens(2048L)
                    .outputConfig(QuestionList.class)
                    .addUserMessage(buildPrompt(skills, experienceLevel, industry, category, count))
                    .build();

            QuestionList result = client.messages().create(params).content().stream()
                    .flatMap(block -> block.text().stream())
                    .findFirst()
                    .orElseThrow(QuestionGenerationUnavailableException::new)
                    .text();

            if (result.questions() == null || result.questions().isEmpty()) {
                throw new QuestionGenerationUnavailableException();
            }
            return result.questions();
        } catch (QuestionGenerationUnavailableException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new QuestionGenerationUnavailableException();
        }
    }

    private String buildPrompt(
            List<String> skills, ExperienceLevel experienceLevel, String industry, String category, int count) {
        String skillsText = skills.isEmpty() ? "unspecified" : String.join(", ", skills);
        String experienceText =
                experienceLevel == null ? "unspecified" : experienceLevel.name().toLowerCase(Locale.ROOT);
        String industryText = (industry == null || industry.isBlank()) ? "unspecified" : industry;

        return """
                Generate %d unique mock interview questions for a job candidate practicing on their own.

                Candidate skills: %s
                Candidate experience level: %s
                Candidate industry: %s
                Interview category/style: %s

                Tailor the questions to the candidate's skills, experience level, and industry where possible, \
                in the tone implied by the interview category. Each question should be a natural, \
                self-contained sentence a real interviewer would ask out loud — no numbering, no preamble, \
                no markdown, and no two questions covering the same ground.
                """
                .formatted(count, skillsText, experienceText, industryText, category);
    }
}
