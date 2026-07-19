package com.openopportunity.mockinterview;

import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidate/mock-interviews")
public class MockInterviewController {

    private final MockInterviewService mockInterviewService;

    public MockInterviewController(MockInterviewService mockInterviewService) {
        this.mockInterviewService = mockInterviewService;
    }

    @PostMapping
    public ResponseEntity<MockInterviewSessionSummary> create(
            @RequestParam("video") MultipartFile video,
            @RequestParam String category,
            @RequestParam int questionCount,
            @RequestParam int durationSeconds) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(mockInterviewService.create(currentUserId(), video, category, questionCount, durationSeconds));
    }

    @GetMapping
    public List<MockInterviewSessionSummary> mine() {
        return mockInterviewService.getMine(currentUserId());
    }

    @GetMapping("/{id}/video")
    public ResponseEntity<Resource> video(@PathVariable UUID id) {
        MockInterviewService.LoadedVideo video = mockInterviewService.getVideo(id, currentUserId());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(video.contentType())).body(video.resource());
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
