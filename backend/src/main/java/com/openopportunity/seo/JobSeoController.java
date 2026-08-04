package com.openopportunity.seo;

import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the same {@code /{lang}/jobs/{jobId}} path the frontend SPA uses for its own
 * client-rendered job detail page (see App.tsx), so this can later become what a crawler (or a
 * load balancer routing by user-agent/path — see infra/README.md) is pointed at instead of the
 * SPA shell, without changing the public URL job listings are shared/indexed under. See
 * JobSeoService for what actually gets rendered, and
 * com.openopportunity.config.SeoSecurityConfig for this route's security config (public,
 * distinct CSP from the rest of the API).
 */
@RestController
public class JobSeoController {

    private final JobSeoService jobSeoService;

    public JobSeoController(JobSeoService jobSeoService) {
        this.jobSeoService = jobSeoService;
    }

    @GetMapping(value = "/{lang:en|hi}/jobs/{jobId}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> jobPage(@PathVariable String lang, @PathVariable UUID jobId) {
        return jobSeoService
                .renderJobPage(jobId, lang)
                .map(html -> ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
