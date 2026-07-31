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
 * src>} can't attach a bearer token, and a candidate's profile photo isn't sensitive the way
 * their resume/contact details are (companies are meant to see it when browsing candidates). */
@RestController
@RequestMapping("/api/candidates")
public class CandidatePhotoController {

    // Only the owner's own profile page appends a cache-busting ?v= (see authStore's
    // candidatePhotoVersion) — every other place a photo is shown (company's candidate search/
    // detail views, admin) hits this exact same URL, so a long/immutable cache would keep
    // serving a stale photo there until this expires. 10 minutes still avoids a re-fetch on
    // every page navigation within a browsing session while keeping that staleness window short.
    private static final CacheControl PHOTO_CACHE_CONTROL = CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic();

    private final CandidateProfileService candidateProfileService;

    public CandidatePhotoController(CandidateProfileService candidateProfileService) {
        this.candidateProfileService = candidateProfileService;
    }

    @GetMapping("/{userId}/photo")
    public ResponseEntity<Resource> getPhoto(@PathVariable UUID userId) {
        CandidateProfileService.CandidatePhotoContent photo = candidateProfileService.getPhoto(userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .cacheControl(PHOTO_CACHE_CONTROL)
                .body(photo.resource());
    }
}
