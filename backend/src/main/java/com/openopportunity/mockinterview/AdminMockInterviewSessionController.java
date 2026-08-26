package com.openopportunity.mockinterview;

import com.openopportunity.mockinterview.dto.AdminMockInterviewSessionSummary;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin listing of every recorded mock interview session across every candidate — see
 * MockInterviewService#adminGetAll for what this returns and SecurityConfig for why this is
 * LEVEL_ADMIN/LEVEL_SUPER_ADMIN only (not reviewer-reachable, same tier as
 * /api/admin/mock-interview-questions/** — a candidate's own recorded video is more sensitive
 * than the question bank reviewer already manages). Watching a video is just following the
 * session's existing public share link (see AdminMockInterviewsPage), not a separate endpoint
 * here. */
@RestController
@RequestMapping("/api/admin/mock-interviews")
public class AdminMockInterviewSessionController {

    private final MockInterviewService mockInterviewService;

    public AdminMockInterviewSessionController(MockInterviewService mockInterviewService) {
        this.mockInterviewService = mockInterviewService;
    }

    @GetMapping
    public List<AdminMockInterviewSessionSummary> all(@RequestParam(required = false) String q) {
        return mockInterviewService.adminGetAll(q);
    }
}
