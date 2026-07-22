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
 * src>} can't attach a bearer token, and a candidate's profile photo isn't sensitive the way
 * their resume/contact details are (companies are meant to see it when browsing candidates). */
@RestController
@RequestMapping("/api/candidates")
public class CandidatePhotoController {

    private final CandidateProfileService candidateProfileService;

    public CandidatePhotoController(CandidateProfileService candidateProfileService) {
        this.candidateProfileService = candidateProfileService;
    }

    @GetMapping("/{userId}/photo")
    public ResponseEntity<Resource> getPhoto(@PathVariable UUID userId) {
        CandidateProfileService.CandidatePhotoContent photo = candidateProfileService.getPhoto(userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.contentType()))
                .body(photo.resource());
    }
}
