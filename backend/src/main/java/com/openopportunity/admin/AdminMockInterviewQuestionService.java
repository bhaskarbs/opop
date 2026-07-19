package com.openopportunity.admin;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.MockInterviewQuestion;
import com.openopportunity.mockinterview.MockInterviewQuestionRepository;
import com.openopportunity.mockinterview.QuestionSource;
import com.openopportunity.mockinterview.dto.AdminMockInterviewQuestionSummary;
import com.openopportunity.mockinterview.dto.CreateMockInterviewQuestionRequest;
import com.openopportunity.mockinterview.exception.DuplicateMockInterviewQuestionException;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** "Content management" scope (small local dataset) — filters in memory, same as
 * AdminUserService.list, rather than building SQL Specifications. */
@Service
public class AdminMockInterviewQuestionService {

    private final MockInterviewQuestionRepository questionRepository;

    public AdminMockInterviewQuestionService(MockInterviewQuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminMockInterviewQuestionSummary> list(
            String skill, String industry, ExperienceLevel experienceLevel, String query) {
        String normalizedSkill = skill == null ? null : skill.trim().toLowerCase();
        String normalizedQuery = query == null ? null : query.trim().toLowerCase();
        return questionRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(question -> experienceLevel == null || question.getExperienceLevel() == experienceLevel)
                .filter(question ->
                        industry == null || industry.isBlank() || industry.equalsIgnoreCase(question.getIndustry()))
                .filter(question -> normalizedSkill == null
                        || normalizedSkill.isBlank()
                        || question.getSkills().stream().anyMatch(s -> s.equalsIgnoreCase(normalizedSkill)))
                .filter(question -> normalizedQuery == null
                        || normalizedQuery.isBlank()
                        || question.getText().toLowerCase().contains(normalizedQuery))
                .map(this::toSummary)
                .toList();
    }

    /** Pre-checked rather than left to the DB's unique index on lower(text) (see V24) so an
     * admin adding a duplicate gets a clean 409 instead of a raw constraint-violation 500. */
    @Transactional
    public AdminMockInterviewQuestionSummary create(CreateMockInterviewQuestionRequest request) {
        if (questionRepository.existsByTextIgnoreCase(request.text())) {
            throw new DuplicateMockInterviewQuestionException();
        }
        MockInterviewQuestion question = new MockInterviewQuestion(
                request.text(), request.skills(), request.industry(), request.experienceLevel(), QuestionSource.ADMIN);
        return toSummary(questionRepository.save(question));
    }

    @Transactional
    public void delete(UUID id) {
        if (!questionRepository.existsById(id)) {
            throw new MockInterviewQuestionNotFoundException(id);
        }
        questionRepository.deleteById(id);
    }

    @Transactional
    public AdminMockInterviewQuestionSummary setImportant(UUID id, boolean important) {
        MockInterviewQuestion question =
                questionRepository.findById(id).orElseThrow(() -> new MockInterviewQuestionNotFoundException(id));
        question.setImportant(important);
        return toSummary(questionRepository.save(question));
    }

    private AdminMockInterviewQuestionSummary toSummary(MockInterviewQuestion question) {
        return new AdminMockInterviewQuestionSummary(
                question.getId(),
                question.getText(),
                question.getSkills(),
                question.getIndustry(),
                question.getExperienceLevel(),
                question.isImportant(),
                question.getSource(),
                question.getCreatedAt());
    }
}
