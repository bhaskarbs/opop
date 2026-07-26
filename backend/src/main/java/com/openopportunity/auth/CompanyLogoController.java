package com.openopportunity.auth;

import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Deliberately public (see SecurityConfig's permitAll for this path) — a plain {@code <img
 * src>} can't attach a bearer token, and a company logo is meant to be shown to anyone browsing
 * jobs, not just the company's own logged-in session. Mirrors CandidatePhotoController. */
@RestController
@RequestMapping("/api/companies")
public class CompanyLogoController {

    private final CompanyProfileService companyProfileService;

    public CompanyLogoController(CompanyProfileService companyProfileService) {
        this.companyProfileService = companyProfileService;
    }

    @GetMapping("/{userId}/logo")
    public ResponseEntity<Resource> getLogo(@PathVariable UUID userId) {
        CompanyProfileService.CompanyLogoContent logo = companyProfileService.getLogo(userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .body(logo.resource());
    }
}
