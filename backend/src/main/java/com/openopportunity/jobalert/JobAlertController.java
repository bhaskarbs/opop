package com.openopportunity.jobalert;

import com.openopportunity.jobalert.dto.JobAlertRequest;
import com.openopportunity.jobalert.dto.JobAlertSummary;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Covered by SecurityConfig's blanket "/api/candidate/**".hasRole("CANDIDATE") rule — no
 * dedicated matcher needed. */
@RestController
@RequestMapping("/api/candidate/job-alerts")
public class JobAlertController {

    private final JobAlertService jobAlertService;

    public JobAlertController(JobAlertService jobAlertService) {
        this.jobAlertService = jobAlertService;
    }

    @GetMapping
    public List<JobAlertSummary> mine() {
        return jobAlertService.getMine(currentUserId());
    }

    @PostMapping
    public ResponseEntity<JobAlertSummary> create(@RequestBody JobAlertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobAlertService.create(currentUserId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        jobAlertService.delete(id, currentUserId());
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
