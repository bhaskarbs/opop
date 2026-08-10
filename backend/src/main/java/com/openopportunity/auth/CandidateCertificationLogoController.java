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

/** Deliberately public (see SecurityConfig's permitAll for this path) — same reasoning as
 * CandidatePhotoController: a plain {@code <img src>} can't attach a bearer token, and a
 * certification logo is meant to be shown off, not hidden. */
@RestController
@RequestMapping("/api/candidates")
public class CandidateCertificationLogoController {

    private static final CacheControl LOGO_CACHE_CONTROL = CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic();

    private final CandidateAccomplishmentService candidateAccomplishmentService;

    public CandidateCertificationLogoController(CandidateAccomplishmentService candidateAccomplishmentService) {
        this.candidateAccomplishmentService = candidateAccomplishmentService;
    }

    @GetMapping("/{userId}/certifications/{certificationId}/logo")
    public ResponseEntity<Resource> getLogo(@PathVariable UUID userId, @PathVariable UUID certificationId) {
        CandidateAccomplishmentService.CertificationLogoContent logo =
                candidateAccomplishmentService.getCertificationLogo(userId, certificationId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .cacheControl(LOGO_CACHE_CONTROL)
                .body(logo.resource());
    }
}
