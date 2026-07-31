package com.openopportunity.auth;

import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
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

    // Only the owner's own profile page appends a cache-busting ?v= (see authStore's
    // companyLogoVersion) — every other place a logo is shown (job search results, job detail,
    // admin) hits this exact same URL, so a long/immutable cache would keep serving a stale
    // logo there until this expires. 10 minutes still avoids a re-fetch on every page
    // navigation within a browsing session while keeping that staleness window short.
    private static final CacheControl LOGO_CACHE_CONTROL = CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic();

    private final CompanyProfileService companyProfileService;

    public CompanyLogoController(CompanyProfileService companyProfileService) {
        this.companyProfileService = companyProfileService;
    }

    @GetMapping("/{userId}/logo")
    public ResponseEntity<Resource> getLogo(@PathVariable UUID userId) {
        CompanyProfileService.CompanyLogoContent logo = companyProfileService.getLogo(userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .cacheControl(LOGO_CACHE_CONTROL)
                .body(logo.resource());
    }
}
