package com.openopportunity.mockinterview;

import com.openopportunity.mockinterview.dto.GenerateQuestionsRequest;
import com.openopportunity.mockinterview.dto.GenerateQuestionsResponse;
import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidate/mock-interviews")
public class MockInterviewController {

    private final MockInterviewService mockInterviewService;
    private final MockInterviewQuestionService mockInterviewQuestionService;

    public MockInterviewController(
            MockInterviewService mockInterviewService, MockInterviewQuestionService mockInterviewQuestionService) {
        this.mockInterviewService = mockInterviewService;
        this.mockInterviewQuestionService = mockInterviewQuestionService;
    }

    @PostMapping("/questions")
    public GenerateQuestionsResponse generateQuestions(@Valid @RequestBody GenerateQuestionsRequest request) {
        return new GenerateQuestionsResponse(mockInterviewQuestionService.getSessionQuestions(
                request.skills(), request.experienceLevel(), request.industry(), request.category(),
                request.count()));
    }

    @PostMapping
    public ResponseEntity<MockInterviewSessionSummary> create(
            @RequestParam("video") MultipartFile video,
            @RequestParam(value = "thumbnail", required = false) MultipartFile thumbnail,
            @RequestParam String category,
            @RequestParam int questionCount,
            @RequestParam int durationSeconds) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mockInterviewService.create(
                        currentUserId(), video, thumbnail, category, questionCount, durationSeconds));
    }

    @GetMapping
    public List<MockInterviewSessionSummary> mine() {
        return mockInterviewService.getMine(currentUserId());
    }

    @GetMapping("/{id}/video")
    public ResponseEntity<Resource> video(@PathVariable UUID id) {
        MockInterviewService.LoadedFile video = mockInterviewService.getVideo(id, currentUserId());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(video.contentType())).body(video.resource());
    }

    @GetMapping("/{id}/thumbnail")
    public ResponseEntity<Resource> thumbnail(@PathVariable UUID id) {
        MockInterviewService.LoadedFile thumbnail = mockInterviewService.getThumbnail(id, currentUserId());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(thumbnail.contentType()))
                .body(thumbnail.resource());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        mockInterviewService.delete(id, currentUserId());
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
