package com.openopportunity.job;

import com.openopportunity.application.ApplicationRepository;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.CompanySubscription;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.CompanySubscriptionRepository;
import com.openopportunity.billing.exception.CompanyNotFoundException;
import com.openopportunity.job.dto.AdminJobBrandingRequest;
import com.openopportunity.job.dto.AdminJobSearchResult;
import com.openopportunity.job.dto.AdminJobSummary;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.dto.JobSearchResult;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.exception.CompanyNotEligibleToPostJobsException;
import com.openopportunity.job.exception.InvalidJobLogoException;
import com.openopportunity.job.exception.InvalidJobStatusTransitionException;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobLogoNotFoundException;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.job.exception.JobPostingLimitReachedException;
import com.openopportunity.jobalert.JobAlertMatchEmailService;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import com.openopportunity.savedjob.SavedJobRepository;
import com.openopportunity.search.JobIndexingService;
import com.openopportunity.search.JobSearchProvider;
import com.openopportunity.storage.AvatarImageResizer;
import com.openopportunity.storage.FileStorageService;
import com.openopportunity.storage.ImageContentValidator;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class JobService {

    // Applies to every status (DRAFT/PENDING_APPROVAL/ACTIVE/REJECTED/CLOSED all count) — same
    // flat-cap approach as IdeaService.MAX_IDEAS_PER_SUBMITTER, so drafts can't be used to dodge
    // the limit. One named exemption — see hasUnlimitedJobPostings /
    // app.jobs.unlimited-posting-company-email.
    private static final long MAX_JOB_POSTINGS_PER_COMPANY = 10;

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CompanySubscriptionRepository companySubscriptionRepository;
    private final ApplicationRepository applicationRepository;
    private final SavedJobRepository savedJobRepository;
    private final NotificationService notificationService;
    private final NewJobMatchEmailService newJobMatchEmailService;
    private final JobAlertMatchEmailService jobAlertMatchEmailService;
    private final JobSearchProvider jobSearchProvider;
    private final Optional<JobIndexingService> jobIndexingService;
    private final FileStorageService fileStorageService;
    private final String unlimitedPostingCompanyEmail;

    public JobService(
            JobRepository jobRepository,
            UserRepository userRepository,
            CompanyProfileRepository companyProfileRepository,
            CompanySubscriptionRepository companySubscriptionRepository,
            ApplicationRepository applicationRepository,
            SavedJobRepository savedJobRepository,
            NotificationService notificationService,
            NewJobMatchEmailService newJobMatchEmailService,
            JobAlertMatchEmailService jobAlertMatchEmailService,
            JobSearchProvider jobSearchProvider,
            Optional<JobIndexingService> jobIndexingService,
            FileStorageService fileStorageService,
            @Value("${app.jobs.unlimited-posting-company-email}") String unlimitedPostingCompanyEmail) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.companySubscriptionRepository = companySubscriptionRepository;
        this.applicationRepository = applicationRepository;
        this.savedJobRepository = savedJobRepository;
        this.notificationService = notificationService;
        this.newJobMatchEmailService = newJobMatchEmailService;
        this.jobAlertMatchEmailService = jobAlertMatchEmailService;
        this.jobSearchProvider = jobSearchProvider;
        // Empty when app.search.provider=postgres (the default) — JobIndexingService only
        // exists as a bean once app.search.provider=elasticsearch (see its
        // @ConditionalOnProperty), so there's nothing to keep in sync in the default case.
        this.jobIndexingService = jobIndexingService;
        this.fileStorageService = fileStorageService;
        this.unlimitedPostingCompanyEmail = unlimitedPostingCompanyEmail;
    }

    // See app.jobs.unlimited-posting-company-email's doc comment in application.properties.
    private boolean hasUnlimitedJobPostings(User company) {
        return company.getEmail().equalsIgnoreCase(unlimitedPostingCompanyEmail);
    }

    // A client-suppliable page size that's too large would defeat pagination's whole point
    // (an unbounded response payload), so this caps it independently of whatever the frontend
    // itself defaults to.
    private static final int MAX_SEARCH_PAGE_SIZE = 50;

    /** Filtering/ordering happens behind JobSearchProvider (Postgres or Elasticsearch — see its
     * javadoc); the featured/promoted-company ranking pass that follows still runs in Java over
     * every matching job, same as before pagination existed, since it needs promoted-company
     * state that isn't worth expressing as a SQL ORDER BY (or an Elasticsearch sort) — only the
     * already-ranked result gets sliced down to the requested page, so a broad, unfiltered
     * search can no longer return an unbounded response. */
    @Transactional(readOnly = true)
    public JobSearchResult search(
            List<String> keywords,
            List<String> locations,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort,
            int page,
            int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_SEARCH_PAGE_SIZE);

        List<UUID> orderedIds = jobSearchProvider.searchIds(keywords, locations, levels, modes, minSalaryLakhs, sort);
        List<Job> unranked = hydrateInOrder(orderedIds);
        Set<UUID> promotedCompanyIds = promotedCompanyIdsFor(unranked);
        List<Job> ranked = rankSearchResults(unranked, promotedCompanyIds);

        int totalCount = ranked.size();
        int totalPages = totalCount == 0 ? 0 : (totalCount + safeSize - 1) / safeSize;
        List<Job> pageJobs =
                ranked.stream().skip((long) safePage * safeSize).limit(safeSize).toList();

        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(pageJobs);
        List<JobSummary> summaries = pageJobs.stream()
                .map(job -> toSummary(
                        job,
                        profilesByCompanyId.get(job.getCompanyId()),
                        promotedCompanyIds.contains(job.getCompanyId())))
                .toList();
        return new JobSearchResult(summaries, safePage, safeSize, totalCount, totalPages);
    }

    /** Layered on top of whatever the caller's sort already produced, same ranking model as
     * CandidateSearchService#resolveSort: an admin-featured posting leads, then a posting from a
     * company on a paid plan (GROWTH/ENTERPRISE), and Stream.sorted's stable-sort guarantee means
     * everything else keeps the DB's original order within those tiers. */
    private List<Job> rankSearchResults(List<Job> jobs, Set<UUID> promotedCompanyIds) {
        return jobs.stream()
                .sorted(Comparator.comparing((Job job) -> job.getFeaturedAt() != null ? 0 : 1)
                        .thenComparing(job -> promotedCompanyIds.contains(job.getCompanyId()) ? 0 : 1))
                .toList();
    }

    /** Mirrors IdeaService.get()'s owner-vs-everyone-else visibility split: anyone can view an
     * ACTIVE job (the public job detail page), but a DRAFT/PENDING_APPROVAL/REJECTED/CLOSED job
     * is only visible to the company that posted it — e.g. so PostJobPage can load an existing
     * posting to edit regardless of its current status. callerId is null for an anonymous
     * request (see JobController.currentUserIdOrNull). */
    @Transactional(readOnly = true)
    public JobDetail get(UUID id, UUID callerId) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        boolean isOwner = callerId != null && job.getCompanyId().equals(callerId);
        if (job.getStatus() != JobStatus.ACTIVE && !isOwner) {
            throw new JobNotFoundException(id);
        }
        return toDetail(
                job,
                companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null),
                isPromoted(job.getCompanyId()));
    }

    /** Admin read of any job's full detail regardless of status or owner — see
     * JobController#adminGet. Distinct from get(id, callerId) above, which 404s a non-owner on
     * anything but an ACTIVE job; AdminJobsPage's edit form needs to load a
     * DRAFT/PENDING_APPROVAL/REJECTED/CLOSED job too. */
    @Transactional(readOnly = true)
    public JobDetail adminGet(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        return toDetail(
                job,
                companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null),
                isPromoted(job.getCompanyId()));
    }

    // Only ever displayed as a small avatar (job cards/detail), same size budget as
    // CompanyProfileService's own logo cap — see AvatarImageResizer.
    private static final long MAX_JOB_LOGO_SIZE_BYTES = 5L * 1024 * 1024;

    /** Sets or clears (blank/null) the display name shown for this job instead of the owning
     * company's real name — see AdminPostJobPage's "Company display name" field. Does not touch
     * companyId/companyName: ownership, notifications, and posting limits still key off the real
     * company account. */
    @Transactional
    public JobDetail adminUpdateBranding(UUID id, AdminJobBrandingRequest request) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        applyBranding(job, request.displayCompanyName());
        return adminGet(id);
    }

    /** Backdates an already-posted job's "posted" date — e.g.
     * scripts/backdate_naukri_jobs.py spreading a batch of already-imported jobs across the
     * last couple weeks so they don't all read "Posted today". See
     * JobRepository#updateCreatedAt for why this can't just go through the normal Job setter. */
    @Transactional
    public JobDetail adminUpdatePostedAt(UUID id, Instant postedAt) {
        if (!jobRepository.existsById(id)) {
            throw new JobNotFoundException(id);
        }
        jobRepository.updateCreatedAt(id, postedAt);
        return adminGet(id);
    }

    /** Same as adminUpdateBranding above, but for a company setting/clearing the override on its
     * own job — e.g. an agency or multi-brand employer posting under a different name (see
     * PostJobPage's "Company display name" field). Owner-scoped like update()/delete() above. */
    @Transactional
    public JobDetail updateBranding(UUID id, UUID companyId, AdminJobBrandingRequest request) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        applyBranding(job, request.displayCompanyName());
        return get(id, companyId);
    }

    private void applyBranding(Job job, String displayCompanyName) {
        job.updateDisplayCompanyName(
                displayCompanyName == null || displayCompanyName.isBlank() ? null : displayCompanyName.trim());
        save(job);
    }

    /** Uploads a custom logo shown for this job instead of the owning company's own logo — see
     * AdminPostJobPage's logo picker. Mirrors CompanyProfileService#uploadLogo (same size cap,
     * same signature-based content validation, same resize-before-store step) but keyed by job
     * id rather than company id, since this is a per-posting override, not a profile-wide one. */
    @Transactional
    public JobDetail adminUploadLogo(UUID id, MultipartFile file) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        applyLogo(job, file);
        return adminGet(id);
    }

    /** Same as adminUploadLogo above, but for a company uploading a logo for its own job.
     * Owner-scoped like update()/delete() above. */
    @Transactional
    public JobDetail uploadLogo(UUID id, UUID companyId, MultipartFile file) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        applyLogo(job, file);
        return get(id, companyId);
    }

    private void applyLogo(Job job, MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to read job logo upload", ex);
        }
        String contentType = validateJobLogo(file, bytes);

        String storageKey;
        try {
            byte[] resized = AvatarImageResizer.resize(bytes);
            storageKey = fileStorageService.store(resized, file.getOriginalFilename(), "job-logos/" + job.getId());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to store job logo", ex);
        }
        job.updateLogo(storageKey, contentType);
        save(job);
    }

    /** Reverts this job back to showing the owning company's own logo. */
    @Transactional
    public JobDetail adminRemoveLogo(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.clearLogo();
        save(job);
        return adminGet(id);
    }

    /** Same as adminRemoveLogo above, but for a company removing its own job's custom logo.
     * Owner-scoped like update()/delete() above. */
    @Transactional
    public JobDetail removeLogo(UUID id, UUID companyId) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        job.clearLogo();
        save(job);
        return get(id, companyId);
    }

    /** Public (unauthenticated) lookup — see JobController, which serves this straight to an
     * &lt;img&gt; tag with no bearer token attached, same as CompanyProfileService#getLogo. */
    @Transactional(readOnly = true)
    public JobLogoContent getLogo(UUID id) {
        Job job = jobRepository
                .findById(id)
                .filter(existing -> existing.getLogoStorageKey() != null)
                .orElseThrow(() -> new JobLogoNotFoundException(id));
        try {
            Resource resource = fileStorageService.load(job.getLogoStorageKey());
            return new JobLogoContent(resource, job.getLogoContentType());
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to load job logo", ex);
        }
    }

    public record JobLogoContent(Resource resource, String contentType) {}

    private String validateJobLogo(MultipartFile file, byte[] bytes) {
        if (file.isEmpty()) {
            throw new InvalidJobLogoException("Logo file is empty");
        }
        if (file.getSize() > MAX_JOB_LOGO_SIZE_BYTES) {
            throw new InvalidJobLogoException("Logo must be 5MB or smaller");
        }
        return ImageContentValidator.detectContentType(bytes)
                .orElseThrow(() -> new InvalidJobLogoException("Logo must be a JPEG, PNG, or WEBP image"));
    }

    @Transactional(readOnly = true)
    public List<JobSummary> getMine(UUID companyId) {
        CompanyProfile companyProfile = companyProfileRepository.findByUserId(companyId).orElse(null);
        boolean promoted = isPromoted(companyId);
        return jobRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(job -> toSummary(job, companyProfile, promoted))
                .toList();
    }

    /** Used by SavedJobService — batch lookup so a candidate's saved-jobs list doesn't do one
     * query per bookmark. Silently drops ids for jobs that no longer exist (deleted since being
     * saved) rather than erroring; the caller (SavedJobService.getMine) filters its own bookmark
     * list down to whatever this returns. */
    @Transactional(readOnly = true)
    public List<JobSummary> getByIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Job> jobs = jobRepository.findAllById(ids);
        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(jobs);
        Set<UUID> promotedCompanyIds = promotedCompanyIdsFor(jobs);
        return jobs.stream()
                .map(job -> toSummary(
                        job,
                        profilesByCompanyId.get(job.getCompanyId()),
                        promotedCompanyIds.contains(job.getCompanyId())))
                .toList();
    }

    /** Used by JobAlertDigestService's nightly sweep — same ACTIVE-only + keyword/location/
     * level/mode matching as search(), plus a createdAfter cutoff so an alert only re-surfaces
     * jobs posted since it last ran. */
    @Transactional(readOnly = true)
    public List<JobSummary> searchPostedAfter(
            List<String> keywords,
            List<String> locations,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            Instant after) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.ACTIVE),
                JobSpecifications.matchesAnyKeyword(keywords),
                JobSpecifications.matchesAnyLocation(locations),
                JobSpecifications.hasLevelIn(levels),
                JobSpecifications.hasModeIn(modes),
                JobSpecifications.createdAfter(after));
        List<Job> jobs = jobRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(jobs);
        Set<UUID> promotedCompanyIds = promotedCompanyIdsFor(jobs);
        return jobs.stream()
                .map(job -> toSummary(
                        job,
                        profilesByCompanyId.get(job.getCompanyId()),
                        promotedCompanyIds.contains(job.getCompanyId())))
                .toList();
    }

    @Transactional
    public JobDetail create(UUID companyId, JobRequest request) {
        requireClientSettableStatus(request.status());
        requireEligibleToPostJobs(companyId);
        User company = userRepository.findById(companyId).orElseThrow();
        if (!hasUnlimitedJobPostings(company) && jobRepository.countByCompanyId(companyId) >= MAX_JOB_POSTINGS_PER_COMPANY) {
            throw new JobPostingLimitReachedException();
        }
        Job job = new Job(
                companyId,
                company.getFullName(),
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.locations(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        job.updateExperienceYears(request.experienceYearsMin(), request.experienceYearsMax());
        save(job);
        if (job.getStatus() == JobStatus.PENDING_APPROVAL) {
            notifyAdminsJobPending(job, company.getFullName());
        }
        return toDetail(
                job, companyProfileRepository.findByUserId(companyId).orElse(null), isPromoted(companyId));
    }

    @Transactional
    public JobDetail update(UUID id, UUID companyId, JobRequest request) {
        requireClientSettableStatus(request.status());
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        JobStatus previousStatus = job.getStatus();
        job.update(
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.locations(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        job.updateExperienceYears(request.experienceYearsMin(), request.experienceYearsMax());
        save(job);
        if (previousStatus != JobStatus.PENDING_APPROVAL && job.getStatus() == JobStatus.PENDING_APPROVAL) {
            User company = userRepository.findById(companyId).orElseThrow();
            notifyAdminsJobPending(job, company.getFullName());
        }
        return toDetail(
                job, companyProfileRepository.findByUserId(companyId).orElse(null), isPromoted(companyId));
    }

    /** Admin-authored job posting (AdminJobsPage) — on behalf of a company the admin chooses,
     * rather than the caller themselves (see create() above, where companyId is always the
     * authenticated caller's own id). Deliberately skips requireEligibleToPostJobs (an admin
     * acting directly is the override for "company profile isn't complete/verified yet", not
     * something that check should block) and requireClientSettableStatus (an admin can publish
     * straight to ACTIVE without a separate approve() call — they *are* the approver). Still
     * enforces MAX_JOB_POSTINGS_PER_COMPANY, same as any other creation path, so this can't be
     * used to bypass that cap either — except for the one named exemption, see
     * hasUnlimitedJobPostings.
     *
     * <p>suppressJobAlertEmails skips only the job-alert email fan-out in notifyJobIsLive (see
     * its javadoc) when the job is created straight to ACTIVE — for the Naukri bulk importer
     * (jobs/scripts/import_naukri_jobs.py), which posts hundreds of scraped jobs per run through
     * this exact endpoint/JWT. A saved job alert can match hundreds of imported rows in a single
     * run, so left on that's hundreds of alert emails for jobs the recipient didn't apply for
     * proactively; the company "it's live" notification and per-candidate skill-match emails
     * still fire same as any other job. A real admin using AdminJobsPage always passes false
     * (see JobController#adminCreate). */
    @Transactional
    public JobDetail adminCreate(UUID companyId, JobRequest request, boolean suppressJobAlertEmails) {
        User company = requireCompany(companyId);
        if (!hasUnlimitedJobPostings(company) && jobRepository.countByCompanyId(companyId) >= MAX_JOB_POSTINGS_PER_COMPANY) {
            throw new JobPostingLimitReachedException();
        }
        Job job = new Job(
                companyId,
                company.getFullName(),
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.locations(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        job.updateExperienceYears(request.experienceYearsMin(), request.experienceYearsMax());
        save(job);
        if (job.getStatus() == JobStatus.PENDING_APPROVAL) {
            notifyAdminsJobPending(job, company.getFullName());
        } else if (job.getStatus() == JobStatus.ACTIVE) {
            notifyJobIsLive(job, suppressJobAlertEmails);
        }
        return toDetail(
                job, companyProfileRepository.findByUserId(companyId).orElse(null), isPromoted(companyId));
    }

    /** Admin edit of any job's content (AdminJobsPage) — mirrors update() above but skips
     * requireOwner (an admin can edit a job regardless of which company posted it) and
     * requireClientSettableStatus (same reasoning as adminCreate — an admin can move a job
     * straight to ACTIVE/REJECTED/CLOSED directly, not just DRAFT/PENDING_APPROVAL). The job
     * keeps its existing owning company; this only edits content, never reassigns ownership. */
    @Transactional
    public JobDetail adminUpdate(UUID id, JobRequest request) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        UUID companyId = job.getCompanyId();
        JobStatus previousStatus = job.getStatus();
        job.update(
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.locations(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        job.updateExperienceYears(request.experienceYearsMin(), request.experienceYearsMax());
        save(job);
        if (previousStatus != JobStatus.PENDING_APPROVAL && job.getStatus() == JobStatus.PENDING_APPROVAL) {
            User company = userRepository.findById(companyId).orElseThrow();
            notifyAdminsJobPending(job, company.getFullName());
        } else if (previousStatus != JobStatus.ACTIVE && job.getStatus() == JobStatus.ACTIVE) {
            notifyJobIsLive(job, false);
        }
        return toDetail(
                job, companyProfileRepository.findByUserId(companyId).orElse(null), isPromoted(companyId));
    }

    /** Same "job just went live" side effects as approve() — reused here so an admin publishing
     * straight to ACTIVE via adminCreate/adminUpdate notifies the company and matching
     * candidates identically to going through the approval queue. suppressJobAlertEmails is only
     * ever true from adminCreate's bulk-import path — see its javadoc. */
    private void notifyJobIsLive(Job job, boolean suppressJobAlertEmails) {
        notificationService.notify(
                job.getCompanyId(),
                NotificationType.JOB_APPROVED,
                "Your job posting \"" + job.getTitle() + "\" has been approved and is now live.",
                "/company/dashboard");
        newJobMatchEmailService.notifyMatchingCandidates(job);
        if (!suppressJobAlertEmails) {
            jobAlertMatchEmailService.notifyMatchingAlerts(job);
        }
    }

    private User requireCompany(UUID companyId) {
        return userRepository
                .findById(companyId)
                .filter(user -> user.getRole() == UserRole.COMPANY)
                .orElseThrow(() -> new CompanyNotFoundException(companyId));
    }

    /** Company-initiated delete of its own job — also removes any candidate applications and
     * saved-job bookmarks for it (see the private delete(Job) below), so a candidate never sees
     * their application stuck at a stale status for a job that's gone. */
    @Transactional
    public void delete(UUID id, UUID companyId) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        delete(job);
    }

    /** Admin-initiated hard delete — unlike delete(id, companyId) above, doesn't require company
     * ownership. Same application/saved-job cleanup as that method (see the private delete(Job)
     * below). Also the per-job half of AdminAccountDeletionService#deleteCompany's cascade. */
    @Transactional
    public void adminDelete(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        delete(job);
    }

    /** Full detail (not the summary search()/mine() return) — the admin review card shows
     * every field, same as an admin reviewing a company profile or idea sees every field. */
    @Transactional(readOnly = true)
    public List<JobDetail> getPending(String q) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.PENDING_APPROVAL), JobSpecifications.matchesAdminReviewQuery(q));
        List<Job> jobs = jobRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(jobs);
        Set<UUID> promotedCompanyIds = promotedCompanyIdsFor(jobs);
        return jobs.stream()
                .map(job -> toDetail(
                        job,
                        profilesByCompanyId.get(job.getCompanyId()),
                        promotedCompanyIds.contains(job.getCompanyId())))
                .toList();
    }

    /** General-purpose admin browsing across every status (AdminJobsPage's status filter) —
     * distinct from search() above, which only ever surfaces ACTIVE jobs (the public listing)
     * and from getPending(), which is hardcoded to the PENDING_APPROVAL review queue. Without
     * this, a job an admin creates or edits into DRAFT/CLOSED/REJECTED has no page it shows up
     * on at all — the admin would have to already know its id. No promoted/featured ranking
     * here (unlike search()) — plain recency ordering is more useful for an admin scanning
     * every status than customer-facing relevance sorting. */
    @Transactional(readOnly = true)
    public AdminJobSearchResult adminSearch(List<JobStatus> statuses, String q, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), MAX_SEARCH_PAGE_SIZE);

        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatusIn(statuses), JobSpecifications.matchesAdminReviewQuery(q));
        List<Job> jobs = jobRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));

        int totalCount = jobs.size();
        int totalPages = totalCount == 0 ? 0 : (totalCount + safeSize - 1) / safeSize;
        List<Job> pageJobs = jobs.stream().skip((long) safePage * safeSize).limit(safeSize).toList();

        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(pageJobs);
        Set<UUID> promotedCompanyIds = promotedCompanyIdsFor(pageJobs);
        List<AdminJobSummary> summaries = pageJobs.stream()
                .map(job -> new AdminJobSummary(
                        toSummary(
                                job,
                                profilesByCompanyId.get(job.getCompanyId()),
                                promotedCompanyIds.contains(job.getCompanyId())),
                        job.getCompanyName()))
                .toList();
        return new AdminJobSearchResult(summaries, safePage, safeSize, totalCount, totalPages);
    }

    @Transactional
    public JobDetail approve(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.approve();
        save(job);
        notifyJobIsLive(job, false);
        return toDetail(
                job,
                companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null),
                isPromoted(job.getCompanyId()));
    }

    @Transactional
    public JobDetail reject(UUID id, String reason) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.reject();
        save(job);
        notificationService.notify(
                job.getCompanyId(),
                NotificationType.JOB_REJECTED,
                "Your job posting \"" + job.getTitle() + "\" was not approved. Reason: " + reason,
                "/company/dashboard");
        return toDetail(
                job,
                companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null),
                isPromoted(job.getCompanyId()));
    }

    /** Pins this posting above the rest of a candidate's job search results (see
     * #rankSearchResults) — an editorial override, same admin-tier scope as AdminUserService's
     * candidate-featuring equivalent. */
    @Transactional
    public JobDetail feature(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.feature();
        save(job);
        return toDetail(
                job,
                companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null),
                isPromoted(job.getCompanyId()));
    }

    @Transactional
    public JobDetail unfeature(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.unfeature();
        save(job);
        return toDetail(
                job,
                companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null),
                isPromoted(job.getCompanyId()));
    }

    /** A company can only post once its verification profile is both complete (entityType/
     * cin/gstin/pan/etc. filled in — never true right after Google sign-in, see
     * AuthService.loginWithGoogleAsCompany) and admin-verified. Searching candidates has no
     * such gate; only posting jobs and (client-side, see SearchCandidatesPage) contacting
     * candidates do. */
    private void requireEligibleToPostJobs(UUID companyId) {
        CompanyProfile profile = companyProfileRepository.findByUserId(companyId).orElseThrow();
        if (!profile.isProfileComplete()) {
            throw new CompanyNotEligibleToPostJobsException("Complete your company profile before posting a job");
        }
        if (!profile.isVerified()) {
            throw new CompanyNotEligibleToPostJobsException(
                    "Your company profile is awaiting admin verification before you can post a job");
        }
    }

    private void requireClientSettableStatus(JobStatus status) {
        if (status == JobStatus.ACTIVE || status == JobStatus.REJECTED) {
            throw new InvalidJobStatusTransitionException();
        }
    }

    private void notifyAdminsJobPending(Job job, String companyName) {
        notificationService.notifyAdmins(
                NotificationType.JOB_PENDING_APPROVAL,
                "New job posting \"" + job.getTitle() + "\" from " + companyName + " is awaiting approval.",
                "/admin/approvals/jobs");
    }

    private void requireOwner(Job job, UUID companyId) {
        if (!job.getCompanyId().equals(companyId)) {
            throw new JobAccessDeniedException();
        }
    }

    /** Every create/update/approve/reject/feature/unfeature goes through this instead of calling
     * jobRepository.save directly, so the Elasticsearch index (when active — see
     * JobIndexingService) never has a chance to drift out of sync with a write that used the
     * other path. Runs inside the same @Transactional method as the write itself, but the index
     * update is best-effort on top (see JobIndexingService's javadoc) — it never rolls back the
     * actual save if it fails. */
    private void save(Job job) {
        jobRepository.save(job);
        jobIndexingService.ifPresent(service -> service.index(job));
    }

    // Neither applications nor saved-job bookmarks have a DB-level FK back to jobs (see
    // architecture doc's database-per-service reasoning), so nothing enforces this cleanup
    // automatically — every job deletion path (company-initiated and admin-initiated) funnels
    // through here specifically so a deleted job never leaves orphaned applications a candidate
    // would otherwise see stuck at a stale status forever, or bookmarks pointing at nothing.
    private void delete(Job job) {
        applicationRepository.deleteByJobId(job.getId());
        savedJobRepository.deleteByJobId(job.getId());
        jobIndexingService.ifPresent(service -> service.delete(job.getId()));
        jobRepository.delete(job);
    }

    private static List<String> nonNull(List<String> values) {
        return values == null ? List.of() : values;
    }

    /** jobRepository.findAllById doesn't preserve its input list's order (JPA makes no such
     * guarantee — in practice it comes back in whatever order the underlying SQL "IN" query's
     * result happens to have), but JobSearchProvider's ordering (recency, salary, or
     * Elasticsearch relevance) is the whole point of calling it — this re-applies that order
     * after hydrating. Silently drops any id JobSearchProvider returned that no longer exists in
     * Postgres (e.g. Elasticsearch briefly out of sync after a delete), same "don't error on a
     * stale reference" convention as getByIds. */
    private List<Job> hydrateInOrder(List<UUID> orderedIds) {
        Map<UUID, Job> jobsById = jobRepository.findAllById(orderedIds).stream()
                .collect(Collectors.toMap(Job::getId, job -> job));
        return orderedIds.stream().map(jobsById::get).filter(Objects::nonNull).toList();
    }

    private Map<UUID, CompanyProfile> companyProfilesFor(List<Job> jobs) {
        List<UUID> companyIds = jobs.stream().map(Job::getCompanyId).distinct().toList();
        return companyProfileRepository.findByUserIdIn(companyIds).stream()
                .collect(Collectors.toMap(CompanyProfile::getUserId, profile -> profile));
    }

    /** Only currently-active paid subscriptions count — a lapsed plan the daily
     * expireOverdueSubscriptions sweep hasn't gotten to yet shouldn't still get promoted. Mirrors
     * CandidateSearchService's plusCandidateIds exactly, one level up (company, not candidate). */
    private Set<UUID> promotedCompanyIdsFor(List<Job> jobs) {
        if (jobs.isEmpty()) {
            return Set.of();
        }
        return companySubscriptionRepository
                .findByPlanNotAndCurrentPeriodEndAfter(CompanySubscriptionPlan.FREE, Instant.now())
                .stream()
                .map(CompanySubscription::getCompanyId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private boolean isPromoted(UUID companyId) {
        return companySubscriptionRepository
                .findByCompanyId(companyId)
                .filter(subscription -> subscription.getPlan() != CompanySubscriptionPlan.FREE)
                .filter(subscription -> subscription.getCurrentPeriodEnd() != null
                        && subscription.getCurrentPeriodEnd().isAfter(Instant.now()))
                .isPresent();
    }

    // A job's own logo override (see Job#updateLogo/AdminPostJobPage) always wins over the
    // owning company's profile logo when both exist — that's the whole point of the override.
    private String companyLogoUrl(Job job, CompanyProfile companyProfile) {
        if (job.getLogoStorageKey() != null) {
            return "/api/jobs/" + job.getId() + "/logo";
        }
        if (companyProfile == null || companyProfile.getLogoStorageKey() == null) {
            return null;
        }
        return "/api/companies/" + companyProfile.getUserId() + "/logo";
    }

    // Same override precedence as companyLogoUrl above — an admin-set display name always wins
    // over the real company account's name.
    private String displayCompanyName(Job job) {
        return job.getDisplayCompanyName() != null ? job.getDisplayCompanyName() : job.getCompanyName();
    }

    private JobSummary toSummary(Job job, CompanyProfile companyProfile, boolean isPromoted) {
        return new JobSummary(
                job.getId(),
                job.getTitle(),
                displayCompanyName(job),
                job.getLocations(),
                job.getWorkMode(),
                job.getExperienceLevel(),
                job.getEmploymentType(),
                job.getSalaryMinLakhs(),
                job.getSalaryMaxLakhs(),
                job.getExperienceYearsMin(),
                job.getExperienceYearsMax(),
                job.getSkills(),
                job.getStatus(),
                job.getApplicantCount(),
                job.getCreatedAt(),
                companyLogoUrl(job, companyProfile),
                isPromoted,
                job.getFeaturedAt() != null);
    }

    private JobDetail toDetail(Job job, CompanyProfile companyProfile, boolean isPromoted) {
        return new JobDetail(
                job.getId(),
                job.getTitle(),
                displayCompanyName(job),
                job.getLocations(),
                job.getWorkMode(),
                job.getExperienceLevel(),
                job.getEmploymentType(),
                job.getSalaryMinLakhs(),
                job.getSalaryMaxLakhs(),
                job.getExperienceYearsMin(),
                job.getExperienceYearsMax(),
                job.getApplicationDeadline(),
                job.getAboutRole(),
                job.getResponsibilities(),
                job.getRequirements(),
                job.getSkills(),
                job.getStatus(),
                job.getApplicantCount(),
                job.getCreatedAt(),
                companyLogoUrl(job, companyProfile),
                isPromoted,
                job.getFeaturedAt() != null);
    }
}
