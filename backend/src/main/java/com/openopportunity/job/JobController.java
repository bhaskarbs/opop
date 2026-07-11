package com.openopportunity.job;

import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.dto.JobSummary;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    public List<JobSummary> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) List<ExperienceLevel> level,
            @RequestParam(required = false) List<WorkMode> mode,
            @RequestParam(required = false) BigDecimal minSalaryLakhs,
            @RequestParam(required = false, defaultValue = "relevant") String sort) {
        return jobService.search(q, location, level, mode, minSalaryLakhs, sort);
    }

    @GetMapping("/mine")
    public List<JobSummary> mine() {
        return jobService.getMine(currentUserId());
    }

    @GetMapping("/pending")
    public List<JobSummary> pending() {
        return jobService.getPending();
    }

    @PostMapping("/{id}/approve")
    public JobDetail approve(@PathVariable UUID id) {
        return jobService.approve(id);
    }

    @PostMapping("/{id}/reject")
    public JobDetail reject(@PathVariable UUID id) {
        return jobService.reject(id);
    }

    @GetMapping("/{id}")
    public JobDetail detail(@PathVariable UUID id) {
        return jobService.getActiveDetail(id);
    }

    @PostMapping
    public ResponseEntity<JobDetail> create(@Valid @RequestBody JobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.create(currentUserId(), request));
    }

    @PutMapping("/{id}")
    public JobDetail update(@PathVariable UUID id, @Valid @RequestBody JobRequest request) {
        return jobService.update(id, currentUserId(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        jobService.delete(id, currentUserId());
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
