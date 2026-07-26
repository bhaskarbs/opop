package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateProfileForCompany;
import com.openopportunity.auth.dto.CandidateSearchSummary;
import com.openopportunity.auth.dto.ResumeHtmlResponse;
import com.openopportunity.auth.dto.RevealCandidateContactResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<String> location) {
        return candidateSearchService.search(currentUserId(), q, location);
    }

    @GetMapping("/{userId}")
    public CandidateProfileForCompany get(@PathVariable UUID userId) {
        return candidateSearchService.get(userId);
    }

    /** disposition=inline (default) lets the frontend render the resume in an <iframe> for the
     * "view as web view" expand link; disposition=attachment is the plain "Download resume"
     * link. Same underlying bytes either way — only the response header differs. */
    @GetMapping("/{userId}/resume")
    public ResponseEntity<Resource> getResume(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "inline") String disposition) {
        CandidateSearchService.LoadedResume resume = candidateSearchService.getResume(currentUserId(), userId);
        String safeDisposition = "attachment".equals(disposition) ? "attachment" : "inline";
        String encodedFileName =
                URLEncoder.encode(resume.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(resume.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        safeDisposition + "; filename*=UTF-8''" + encodedFileName)
                .body(resume.resource());
    }

    @GetMapping("/{userId}/resume/html")
    public ResumeHtmlResponse getResumeHtml(@PathVariable UUID userId) {
        return new ResumeHtmlResponse(candidateSearchService.getResumeHtml(currentUserId(), userId));
    }

    @PostMapping("/{userId}/reveal-contact")
    public RevealCandidateContactResponse revealContact(@PathVariable UUID userId) {
        return candidateSearchService.revealContact(currentUserId(), userId);
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
