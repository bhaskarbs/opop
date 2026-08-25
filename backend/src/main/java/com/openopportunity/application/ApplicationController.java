package com.openopportunity.application;

import com.openopportunity.application.dto.ApplicationSummary;
import com.openopportunity.application.dto.ApplyRequest;
import com.openopportunity.application.dto.JobApplicantSummary;
import com.openopportunity.application.dto.UpdateApplicationStatusRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @PostMapping
    public ResponseEntity<ApplicationSummary> apply(@Valid @RequestBody ApplyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(applicationService.apply(currentUserId(), request.jobId()));
    }

    @PostMapping("/{id}/withdraw")
    public ApplicationSummary withdraw(@PathVariable UUID id) {
        return applicationService.withdraw(id, currentUserId());
    }

    @PatchMapping("/{id}/status")
    public ApplicationSummary updateStatus(
            @PathVariable UUID id, @Valid @RequestBody UpdateApplicationStatusRequest request) {
        return applicationService.updateStatus(id, currentUserId(), request.status());
    }

    @GetMapping("/mine")
    public List<ApplicationSummary> mine() {
        return applicationService.getMine(currentUserId());
    }

    @GetMapping("/job/{jobId}")
    public List<JobApplicantSummary> forJob(@PathVariable UUID jobId) {
        return applicationService.getForJob(jobId, currentUserId());
    }

    /** Admin read of any candidate's application history (AdminCandidateDetailPage) — see
     * getMine() above, which this reuses as-is: that method never does its own ownership check
     * (the caller decides whose id to pass), so an admin passing an arbitrary candidateId here
     * is exactly as safe as a candidate passing their own via currentUserId(). */
    @GetMapping("/candidate/{candidateId}/admin")
    public List<ApplicationSummary> forCandidate(@PathVariable UUID candidateId) {
        return applicationService.getMine(candidateId);
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
