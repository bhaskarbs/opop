package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.MockInterviewQuestion;
import com.openopportunity.mockinterview.MockInterviewQuestionRepository;
import com.openopportunity.mockinterview.QuestionDifficulty;
import com.openopportunity.mockinterview.QuestionSource;
import com.openopportunity.mockinterview.dto.AdminMockInterviewQuestionSummary;
import com.openopportunity.mockinterview.dto.CreateMockInterviewQuestionRequest;
import com.openopportunity.mockinterview.exception.DuplicateMockInterviewQuestionException;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminMockInterviewQuestionServiceTest {

    private final MockInterviewQuestionRepository questionRepository = mock(MockInterviewQuestionRepository.class);
    private final AdminMockInterviewQuestionService service =
            new AdminMockInterviewQuestionService(questionRepository);

    private MockInterviewQuestion question(
            String text, List<ExperienceLevel> levels, QuestionDifficulty difficulty) {
        return new MockInterviewQuestion(
                text, List.of(), null, levels, difficulty, QuestionSource.ADMIN);
    }

    @Test
    void listMatchesAQuestionWhenAnySelectedLevelOverlapsItsOwnLevels() {
        MockInterviewQuestion entryAndMid =
                question("Q1", List.of(ExperienceLevel.ENTRY_LEVEL, ExperienceLevel.MID_LEVEL), null);
        MockInterviewQuestion seniorOnly = question("Q2", List.of(ExperienceLevel.SENIOR), null);
        when(questionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(entryAndMid, seniorOnly));

        List<AdminMockInterviewQuestionSummary> results =
                service.list(null, null, List.of(ExperienceLevel.MID_LEVEL, ExperienceLevel.LEADERSHIP), null);

        assertThat(results).extracting(AdminMockInterviewQuestionSummary::text).containsExactly("Q1");
    }

    @Test
    void listAlwaysMatchesAQuestionTaggedWithNoLevelsRegardlessOfFilter() {
        MockInterviewQuestion anyLevel = question("Q1", List.of(), null);
        when(questionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(anyLevel));

        List<AdminMockInterviewQuestionSummary> results =
                service.list(null, null, List.of(ExperienceLevel.SENIOR), null);

        assertThat(results).extracting(AdminMockInterviewQuestionSummary::text).containsExactly("Q1");
    }

    @Test
    void listReturnsEverythingWhenNoLevelsAreSelected() {
        MockInterviewQuestion entry = question("Q1", List.of(ExperienceLevel.ENTRY_LEVEL), null);
        MockInterviewQuestion senior = question("Q2", List.of(ExperienceLevel.SENIOR), null);
        when(questionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(entry, senior));

        List<AdminMockInterviewQuestionSummary> results = service.list(null, null, List.of(), null);

        assertThat(results).hasSize(2);
    }

    @Test
    void createStoresDifficultyAndMultipleExperienceLevels() {
        when(questionRepository.existsByTextIgnoreCase(any())).thenReturn(false);
        when(questionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        CreateMockInterviewQuestionRequest request = new CreateMockInterviewQuestionRequest(
                "Tell me about a time you led a project.",
                List.of("Leadership"),
                "Tech",
                List.of(ExperienceLevel.SENIOR, ExperienceLevel.LEADERSHIP),
                QuestionDifficulty.DIFFICULT);

        AdminMockInterviewQuestionSummary summary = service.create(request);

        assertThat(summary.experienceLevels()).containsExactly(ExperienceLevel.SENIOR, ExperienceLevel.LEADERSHIP);
        assertThat(summary.difficulty()).isEqualTo(QuestionDifficulty.DIFFICULT);
    }

    @Test
    void createRejectsADuplicateQuestionText() {
        when(questionRepository.existsByTextIgnoreCase("Duplicate?")).thenReturn(true);
        CreateMockInterviewQuestionRequest request =
                new CreateMockInterviewQuestionRequest("Duplicate?", List.of(), null, List.of(), null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateMockInterviewQuestionException.class);
    }
}
