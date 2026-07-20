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
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobService {

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
            String q,
            String location,
            List<ExperienceLevel> levels,
            List<WorkMode> modes,
            BigDecimal minSalaryLakhs,
            String sort) {
        Specification<Job> spec = Specification.allOf(
                JobSpecifications.hasStatus(JobStatus.ACTIVE),
                JobSpecifications.matchesKeyword(q),
                JobSpecifications.matchesLocation(location),
                JobSpecifications.hasLevelIn(levels),
                JobSpecifications.hasModeIn(modes),
                JobSpecifications.hasMinSalaryAtLeast(minSalaryLakhs));

        return jobRepository.findAll(spec, resolveSort(sort)).stream().map(this::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public JobDetail getActiveDetail(UUID id) {
        Job job = jobRepository.findById(id).filter(j -> j.getStatus() == JobStatus.ACTIVE).orElseThrow(
                () -> new JobNotFoundException(id));
        return toDetail(job);
    }

    @Transactional(readOnly = true)
    public List<JobSummary> getMine(UUID companyId) {
        return jobRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional
    public JobDetail create(UUID companyId, JobRequest request) {
        requireClientSettableStatus(request.status());
        requireEligibleToPostJobs(companyId);
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
        return toDetail(job);
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
        return toDetail(job);
    }

    @Transactional
    public void delete(UUID id, UUID companyId) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        requireOwner(job, companyId);
        jobRepository.delete(job);
    }

    @Transactional(readOnly = true)
    public List<JobSummary> getPending() {
        return jobRepository.findByStatusOrderByCreatedAtDesc(JobStatus.PENDING_APPROVAL).stream()
                .map(this::toSummary)
                .toList();
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
        return toDetail(job);
    }

    @Transactional
    public JobDetail reject(UUID id) {
        Job job = jobRepository.findById(id).orElseThrow(() -> new JobNotFoundException(id));
        job.reject();
        jobRepository.save(job);
        notificationService.notify(
                job.getCompanyId(),
                NotificationType.JOB_REJECTED,
                "Your job posting \"" + job.getTitle() + "\" was not approved.",
                "/company/dashboard");
        return toDetail(job);
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

    private JobSummary toSummary(Job job) {
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
                job.getCreatedAt());
    }

    private JobDetail toDetail(Job job) {
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
                job.getCreatedAt());
    }
}
