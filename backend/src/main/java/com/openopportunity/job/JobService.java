package com.openopportunity.job;

import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.exception.CompanyNotEligibleToPostJobsException;
import com.openopportunity.job.exception.InvalidJobStatusTransitionException;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.job.exception.JobPostingLimitReachedException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {

    // Applies to every status (DRAFT/PENDING_APPROVAL/ACTIVE/REJECTED/CLOSED all count) — same
    // flat-cap approach as IdeaService.MAX_IDEAS_PER_SUBMITTER, so drafts can't be used to dodge
    // the limit.
    private static final long MAX_JOB_POSTINGS_PER_COMPANY = 10;

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final NotificationService notificationService;

    public JobService(
            JobRepository jobRepository,
            UserRepository userRepository,
            CompanyProfileRepository companyProfileRepository,
            NotificationService notificationService) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<JobSummary> search(
            List<String> keywords,
            List<String> locations,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.ACTIVE),
                JobSpecifications.matchesAnyKeyword(keywords),
                JobSpecifications.matchesAnyLocation(locations),
                JobSpecifications.hasLevelIn(levels),
                JobSpecifications.hasModeIn(modes),
                JobSpecifications.hasMinSalaryAtLeast(minSalaryLakhs));

        List<Job> jobs = jobRepository.findAll(spec, resolveSort(sort));
        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(jobs);
        return jobs.stream().map(job -> toSummary(job, profilesByCompanyId.get(job.getCompanyId()))).toList();
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
        return toDetail(job, companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null));
    }

    @Transactional(readOnly = true)
    public List<JobSummary> getMine(UUID companyId) {
        CompanyProfile companyProfile = companyProfileRepository.findByUserId(companyId).orElse(null);
        return jobRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(job -> toSummary(job, companyProfile))
                .toList();
    }

    @Transactional
    public JobDetail create(UUID companyId, JobRequest request) {
        requireClientSettableStatus(request.status());
        requireEligibleToPostJobs(companyId);
        if (jobRepository.countByCompanyId(companyId) >= MAX_JOB_POSTINGS_PER_COMPANY) {
            throw new JobPostingLimitReachedException();
        }
        User company = userRepository.findById(companyId).orElseThrow();
        Job job = new Job(
                companyId,
                company.getFullName(),
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.location(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        jobRepository.save(job);
        return toDetail(job, companyProfileRepository.findByUserId(companyId).orElse(null));
    }

    @Transactional
    public JobDetail update(UUID id, UUID companyId, JobRequest request) {
        requireClientSettableStatus(request.status());
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        job.update(
                request.title(),
                request.employmentType(),
                request.experienceLevel(),
                request.workMode(),
                request.location(),
                request.salaryMinLakhs(),
                request.salaryMaxLakhs(),
                request.applicationDeadline(),
                request.aboutRole(),
                nonNull(request.responsibilities()),
                nonNull(request.requirements()),
                nonNull(request.skills()),
                request.status());
        jobRepository.save(job);
        return toDetail(job, companyProfileRepository.findByUserId(companyId).orElse(null));
    }

    @Transactional
    public void delete(UUID id, UUID companyId) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        jobRepository.delete(job);
    }

    /** Full detail (not the summary search()/mine() return) — the admin review card shows
     * every field, same as an admin reviewing a company profile or idea sees every field. */
    @Transactional(readOnly = true)
    public List<JobDetail> getPending(String q) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.PENDING_APPROVAL), JobSpecifications.matchesAdminReviewQuery(q));
        List<Job> jobs = jobRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"));
        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfilesFor(jobs);
        return jobs.stream().map(job -> toDetail(job, profilesByCompanyId.get(job.getCompanyId()))).toList();
    }

    @Transactional
    public JobDetail approve(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.approve();
        jobRepository.save(job);
        notificationService.notify(
                job.getCompanyId(),
                NotificationType.JOB_APPROVED,
                "Your job posting \"" + job.getTitle() + "\" has been approved and is now live.",
                "/company/dashboard");
        return toDetail(job, companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null));
    }

    @Transactional
    public JobDetail reject(UUID id, String reason) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.reject();
        jobRepository.save(job);
        notificationService.notify(
                job.getCompanyId(),
                NotificationType.JOB_REJECTED,
                "Your job posting \"" + job.getTitle() + "\" was not approved. Reason: " + reason,
                "/company/dashboard");
        return toDetail(job, companyProfileRepository.findByUserId(job.getCompanyId()).orElse(null));
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

    private void requireOwner(Job job, UUID companyId) {
        if (!job.getCompanyId().equals(companyId)) {
            throw new JobAccessDeniedException();
        }
    }

    private static List<String> nonNull(List<String> values) {
        return values == null ? List.of() : values;
    }

    private Sort resolveSort(String sort) {
        if ("salary".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "salaryMaxLakhs");
        }
        // "newest" and the default ("relevant" — no ranking model exists yet) both fall back to
        // recency, which is the only ordering signal this basic search actually has.
        return Sort.by(Sort.Direction.DESC, "createdAt");
    }

    private Map<UUID, CompanyProfile> companyProfilesFor(List<Job> jobs) {
        List<UUID> companyIds = jobs.stream().map(Job::getCompanyId).distinct().toList();
        return companyProfileRepository.findByUserIdIn(companyIds).stream()
                .collect(Collectors.toMap(CompanyProfile::getUserId, profile -> profile));
    }

    private String companyLogoUrl(CompanyProfile companyProfile) {
        if (companyProfile == null || companyProfile.getLogoStorageKey() == null) {
            return null;
        }
        return "/api/companies/" + companyProfile.getUserId() + "/logo";
    }

    private JobSummary toSummary(Job job, CompanyProfile companyProfile) {
        return new JobSummary(
                job.getId(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getWorkMode(),
                job.getExperienceLevel(),
                job.getEmploymentType(),
                job.getSalaryMinLakhs(),
                job.getSalaryMaxLakhs(),
                job.getSkills(),
                job.getStatus(),
                job.getApplicantCount(),
                job.getCreatedAt(),
                companyLogoUrl(companyProfile));
    }

    private JobDetail toDetail(Job job, CompanyProfile companyProfile) {
        return new JobDetail(
                job.getId(),
                job.getTitle(),
                job.getCompanyName(),
                job.getLocation(),
                job.getWorkMode(),
                job.getExperienceLevel(),
                job.getEmploymentType(),
                job.getSalaryMinLakhs(),
                job.getSalaryMaxLakhs(),
                job.getApplicationDeadline(),
                job.getAboutRole(),
                job.getResponsibilities(),
                job.getRequirements(),
                job.getSkills(),
                job.getStatus(),
                job.getApplicantCount(),
                job.getCreatedAt(),
                companyLogoUrl(companyProfile));
    }
}
