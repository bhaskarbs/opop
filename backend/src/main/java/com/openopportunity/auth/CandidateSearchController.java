package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateSearchSummary;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
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
        return candidateSearchService.search(q, location);
    }
}
