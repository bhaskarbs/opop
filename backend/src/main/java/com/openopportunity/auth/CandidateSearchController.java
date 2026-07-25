package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateSearchSummary;
import com.openopportunity.auth.dto.RevealCandidateContactResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/company/candidates")
public class CandidateSearchController {

    private final CandidateSearchService candidateSearchService;

    public CandidateSearchController(CandidateSearchService candidateSearchService) {
        this.candidateSearchService = candidateSearchService;
    }

    @GetMapping
    public List<CandidateSearchSummary> search(
            @RequestParam(required = false) String q, @RequestParam(required = false) String location) {
        return candidateSearchService.search(currentUserId(), q, location);
    }

    @PostMapping("/{userId}/reveal-contact")
    public RevealCandidateContactResponse revealContact(@PathVariable UUID userId) {
        return candidateSearchService.revealContact(currentUserId(), userId);
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
