package com.openopportunity.admin;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.mockinterview.dto.AdminMockInterviewQuestionSummary;
import com.openopportunity.mockinterview.dto.CreateMockInterviewQuestionRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/mock-interview-questions")
public class AdminMockInterviewQuestionController {

    private final AdminMockInterviewQuestionService adminMockInterviewQuestionService;

    public AdminMockInterviewQuestionController(AdminMockInterviewQuestionService adminMockInterviewQuestionService) {
        this.adminMockInterviewQuestionService = adminMockInterviewQuestionService;
    }

    @GetMapping
    public List<AdminMockInterviewQuestionSummary> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) ExperienceLevel experienceLevel,
            @RequestParam(required = false) String q) {
        return adminMockInterviewQuestionService.list(category, skill, industry, experienceLevel, q);
    }

    @PostMapping
    public ResponseEntity<AdminMockInterviewQuestionSummary> create(
            @Valid @RequestBody CreateMockInterviewQuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminMockInterviewQuestionService.create(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        adminMockInterviewQuestionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/highlight")
    public AdminMockInterviewQuestionSummary highlight(@PathVariable UUID id) {
        return adminMockInterviewQuestionService.setImportant(id, true);
    }

    @PostMapping("/{id}/unhighlight")
    public AdminMockInterviewQuestionSummary unhighlight(@PathVariable UUID id) {
        return adminMockInterviewQuestionService.setImportant(id, false);
    }
}
