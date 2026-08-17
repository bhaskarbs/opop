package com.openopportunity.admin;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.MockInterviewQuestion;
import com.openopportunity.mockinterview.MockInterviewQuestionRepository;
import com.openopportunity.mockinterview.QuestionSource;
import com.openopportunity.mockinterview.dto.AdminMockInterviewQuestionSummary;
import com.openopportunity.mockinterview.dto.CreateMockInterviewQuestionRequest;
import com.openopportunity.mockinterview.exception.DuplicateMockInterviewQuestionException;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionNotFoundException;
import java.util.Collections;
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
            String skill, String industry, List<ExperienceLevel> experienceLevels, String query) {
        String normalizedSkill = skill == null ? null : skill.trim().toLowerCase();
        String normalizedQuery = query == null ? null : query.trim().toLowerCase();
        return questionRepository.findAllByOrderByCreatedAtDesc().stream()
                // A question tagged with no levels applies to anyone, so it always matches; when
                // both sides carry levels, matching is "any overlap" (OR), not "all selected
                // filter levels must be present".
                .filter(question -> experienceLevels == null
                        || experienceLevels.isEmpty()
                        || question.getExperienceLevels().isEmpty()
                        || !Collections.disjoint(question.getExperienceLevels(), experienceLevels))
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
                request.text(),
                request.skills(),
                request.industry(),
                request.experienceLevels(),
                request.difficulty(),
                QuestionSource.ADMIN);
        return toSummary(questionRepository.save(question));
    }

    /** Same pre-checked-duplicate reasoning as create — excludes the question's own row (see
     * existsByTextIgnoreCaseAndIdNot) so re-saving without changing the text doesn't 409 against
     * itself. */
    @Transactional
    public AdminMockInterviewQuestionSummary update(UUID id, CreateMockInterviewQuestionRequest request) {
        MockInterviewQuestion question =
                questionRepository.findById(id).orElseThrow(() -> new MockInterviewQuestionNotFoundException(id));
        if (questionRepository.existsByTextIgnoreCaseAndIdNot(request.text(), id)) {
            throw new DuplicateMockInterviewQuestionException();
        }
        question.update(
                request.text(), request.skills(), request.industry(), request.experienceLevels(), request.difficulty());
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
                question.getExperienceLevels(),
                question.getDifficulty(),
                question.isImportant(),
                question.getSource(),
                question.getCreatedAt());
    }
}
