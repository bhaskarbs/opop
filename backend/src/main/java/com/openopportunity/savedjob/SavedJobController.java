package com.openopportunity.savedjob;

import com.openopportunity.job.dto.JobSummary;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Covered by SecurityConfig's blanket "/api/candidate/**".hasRole("CANDIDATE") rule — no
 * dedicated matcher needed. */
@RestController
@RequestMapping("/api/candidate/saved-jobs")
public class SavedJobController {

    private final SavedJobService savedJobService;

    public SavedJobController(SavedJobService savedJobService) {
        this.savedJobService = savedJobService;
    }

    @GetMapping
    public List<JobSummary> mine() {
        return savedJobService.getMine(currentUserId());
    }

    @PostMapping("/{jobId}")
    public ResponseEntity<Void> save(@PathVariable UUID jobId) {
        savedJobService.save(currentUserId(), jobId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> unsave(@PathVariable UUID jobId) {
        savedJobService.unsave(currentUserId(), jobId);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
