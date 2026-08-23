package com.openopportunity.job;

import com.openopportunity.job.dto.AdminJobBrandingRequest;
import com.openopportunity.job.dto.AdminJobSearchResult;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.dto.JobSearchResult;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.dto.RejectJobRequest;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    public JobSearchResult search(
            @RequestParam(required = false) List<String> q,
            @RequestParam(required = false) List<String> location,
            @RequestParam(required = false) List<ExperienceLevel> level,
            @RequestParam(required = false) List<WorkMode> mode,
            @RequestParam(required = false) BigDecimal minSalaryLakhs,
            @RequestParam(required = false, defaultValue = "relevant") String sort,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size) {
        return jobService.search(q, location, level, mode, minSalaryLakhs, sort, page, size);
    }

    @GetMapping("/mine")
    public List<JobSummary> mine() {
        return jobService.getMine(currentUserId());
    }

    @GetMapping("/pending")
    public List<JobDetail> pending(@RequestParam(required = false) String q) {
        return jobService.getPending(q);
    }

    @PostMapping("/{id}/approve")
    public JobDetail approve(@PathVariable UUID id) {
        return jobService.approve(id);
    }

    @PostMapping("/{id}/reject")
    public JobDetail reject(@PathVariable UUID id, @Valid @RequestBody RejectJobRequest request) {
        return jobService.reject(id, request.reason());
    }

    @PostMapping("/{id}/feature")
    public JobDetail feature(@PathVariable UUID id) {
        return jobService.feature(id);
    }

    @PostMapping("/{id}/unfeature")
    public JobDetail unfeature(@PathVariable UUID id) {
        return jobService.unfeature(id);
    }

    @GetMapping("/{id}")
    public JobDetail detail(@PathVariable UUID id) {
        return jobService.get(id, currentUserIdOrNull());
    }

    /** Admin read of any job's full detail, regardless of status or owner — see
     * JobService#adminGet. Backs AdminJobsPage's edit form, which otherwise couldn't load a
     * non-ACTIVE job it doesn't own via the plain detail() endpoint above. */
    @GetMapping("/{id}/admin")
    public JobDetail adminDetail(@PathVariable UUID id) {
        return jobService.adminGet(id);
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

    /** Company setting/clearing a display-name override on its own job — see
     * JobService#updateBranding. Owner-scoped counterpart of adminUpdateBranding below. */
    @PutMapping("/{id}/branding")
    public JobDetail updateBranding(@PathVariable UUID id, @RequestBody AdminJobBrandingRequest request) {
        return jobService.updateBranding(id, currentUserId(), request);
    }

    /** Company uploading a custom logo for its own job — see JobService#uploadLogo. Owner-scoped
     * counterpart of adminUploadLogo below. */
    @PostMapping("/{id}/logo")
    public JobDetail uploadLogo(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return jobService.uploadLogo(id, currentUserId(), file);
    }

    /** Company removing its own job's custom logo — see JobService#removeLogo. Owner-scoped
     * counterpart of adminRemoveLogo below. */
    @DeleteMapping("/{id}/logo")
    public JobDetail removeLogo(@PathVariable UUID id) {
        return jobService.removeLogo(id, currentUserId());
    }

    /** Admin hard delete — distinct from delete(id) above, which is owner-scoped; this one
     * requires no ownership and also cleans up applications and saved-job bookmarks (see
     * JobService#adminDelete). */
    @DeleteMapping("/{id}/admin")
    public ResponseEntity<Void> adminDelete(@PathVariable UUID id) {
        jobService.adminDelete(id);
        return ResponseEntity.noContent().build();
    }

    /** Admin browsing across every status (AdminJobsPage's status filter) — see
     * JobService#adminSearch. Distinct from search() above, which is the public listing and
     * only ever returns ACTIVE jobs. */
    @GetMapping("/admin")
    public AdminJobSearchResult adminSearch(
            @RequestParam(required = false) List<JobStatus> status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size) {
        return jobService.adminSearch(status, q, page, size);
    }

    /** Admin posting a job on behalf of a company (AdminJobsPage) — see JobService#adminCreate
     * for how this differs from create() above (companyId is chosen by the admin, not the
     * caller; skips the eligibility/status-transition gates a company itself is bound by). */
    @PostMapping("/admin")
    public ResponseEntity<JobDetail> adminCreate(
            @RequestParam UUID companyId, @Valid @RequestBody JobRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobService.adminCreate(companyId, request));
    }

    /** Admin edit of any job's content, regardless of which company owns it — see
     * JobService#adminUpdate. Distinct from update(id) above, which is owner-scoped. */
    @PutMapping("/{id}/admin")
    public JobDetail adminUpdate(@PathVariable UUID id, @Valid @RequestBody JobRequest request) {
        return jobService.adminUpdate(id, request);
    }

    // Same 10-minute public cache as CompanyLogoController — see its javadoc for why.
    private static final CacheControl LOGO_CACHE_CONTROL = CacheControl.maxAge(10, TimeUnit.MINUTES).cachePublic();

    /** Sets or clears the display company name shown on this job instead of the owning
     * company's real name — see JobService#adminUpdateBranding. */
    @PutMapping("/{id}/admin/branding")
    public JobDetail adminUpdateBranding(
            @PathVariable UUID id, @RequestBody AdminJobBrandingRequest request) {
        return jobService.adminUpdateBranding(id, request);
    }

    /** Backdates an already-posted job's "posted" date — see JobService#adminUpdatePostedAt.
     * Used by scripts/backdate_naukri_jobs.py to spread a batch of already-imported jobs across
     * the last couple weeks instead of every one reading "Posted today". */
    @PutMapping("/{id}/admin/posted-at")
    public JobDetail adminUpdatePostedAt(@PathVariable UUID id, @RequestParam Instant postedAt) {
        return jobService.adminUpdatePostedAt(id, postedAt);
    }

    /** Uploads a custom logo shown on this job instead of the owning company's own logo — see
     * JobService#adminUploadLogo. */
    @PostMapping("/{id}/admin/logo")
    public JobDetail adminUploadLogo(@PathVariable UUID id, @RequestParam("file") MultipartFile file) {
        return jobService.adminUploadLogo(id, file);
    }

    /** Reverts this job back to the owning company's own logo — see JobService#adminRemoveLogo. */
    @DeleteMapping("/{id}/admin/logo")
    public JobDetail adminRemoveLogo(@PathVariable UUID id) {
        return jobService.adminRemoveLogo(id);
    }

    /** Deliberately public (see SecurityConfig's permitAll for this path) — a plain
     * {@code <img src>} can't attach a bearer token, mirrors CompanyLogoController. Only ever
     * reachable for a job that actually has a custom logo override (see companyLogoUrl in
     * JobService, which only ever points here when one exists). */
    @GetMapping("/{id}/logo")
    public ResponseEntity<Resource> logo(@PathVariable UUID id) {
        JobService.JobLogoContent logo = jobService.getLogo(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(logo.contentType()))
                .cacheControl(LOGO_CACHE_CONTROL)
                .body(logo.resource());
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /** GET /{id} is public (permitAll, see SecurityConfig) — an anonymous request still gets an
     * Authentication object from Spring Security, but its principal is the string "anonymousUser"
     * rather than a UUID, so this can't reuse currentUserId()'s unchecked cast. */
    private UUID currentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        return principal instanceof UUID userId ? userId : null;
    }
}
