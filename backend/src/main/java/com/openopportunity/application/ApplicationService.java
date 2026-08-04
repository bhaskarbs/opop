package com.openopportunity.application;

import com.openopportunity.analytics.AnalyticsService;
import com.openopportunity.application.dto.ApplicationSummary;
import com.openopportunity.application.dto.JobApplicantSummary;
import com.openopportunity.application.exception.ApplicationAccessDeniedException;
import com.openopportunity.application.exception.ApplicationNotFoundException;
import com.openopportunity.application.exception.DuplicateApplicationException;
import com.openopportunity.auth.CandidateContactReveal;
import com.openopportunity.auth.CandidateContactRevealRepository;
import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateContactRevealRepository candidateContactRevealRepository;
    private final AnalyticsService analyticsService;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            JobRepository jobRepository,
            NotificationService notificationService,
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            CandidateContactRevealRepository candidateContactRevealRepository,
            AnalyticsService analyticsService) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.candidateContactRevealRepository = candidateContactRevealRepository;
        this.analyticsService = analyticsService;
    }

    @Transactional
    public ApplicationSummary apply(UUID candidateId, UUID jobId) {
        Job job = jobRepository.findById(jobId).filter(j -> j.getStatus() == JobStatus.ACTIVE).orElseThrow(
                () -> new JobNotFoundException(jobId));
        if (applicationRepository.existsByJobIdAndCandidateId(jobId, candidateId)) {
            throw new DuplicateApplicationException();
        }

        Application application = new Application(jobId, candidateId, job.getTitle(), job.getCompanyName());
        applicationRepository.save(application);
        job.incrementApplicantCount();
        jobRepository.save(job);

        User candidate = userRepository.findById(candidateId).orElseThrow();
        notificationService.notify(
                job.getCompanyId(),
                NotificationType.NEW_JOB_APPLICATION,
                candidate.getFullName() + " applied to your \"" + job.getTitle() + "\" job posting.",
                "/company/job-postings/" + jobId + "/applicants");

        analyticsService.capture(candidateId, "application_submitted", Map.of("jobId", jobId));
        return toSummary(application);
    }

    @Transactional
    public ApplicationSummary withdraw(UUID applicationId, UUID candidateId) {
        Application application =
                applicationRepository.findById(applicationId).orElseThrow(
                        () -> new ApplicationNotFoundException(applicationId));
        if (!application.getCandidateId().equals(candidateId)) {
            throw new ApplicationAccessDeniedException();
        }
        if (!application.isWithdrawn()) {
            application.withdraw();
            applicationRepository.save(application);
            jobRepository.findById(application.getJobId()).ifPresent(job -> {
                job.decrementApplicantCount();
                jobRepository.save(job);
            });
        }
        return toSummary(application);
    }

    @Transactional
    public ApplicationSummary updateStatus(UUID applicationId, UUID companyId, ApplicationStatus status) {
        Application application =
                applicationRepository.findById(applicationId).orElseThrow(
                        () -> new ApplicationNotFoundException(applicationId));
        Job job = jobRepository.findById(application.getJobId()).orElseThrow(
                () -> new JobNotFoundException(application.getJobId()));
        if (!job.getCompanyId().equals(companyId)) {
            throw new ApplicationAccessDeniedException();
        }
        application.updateStatus(status);
        applicationRepository.save(application);
        notificationService.notify(
                application.getCandidateId(),
                NotificationType.APPLICATION_STATUS_CHANGED,
                "Your application to " + application.getJobTitle() + " at " + application.getCompanyName()
                        + " is now " + statusLabel(status) + ".",
                "/candidate/applications");
        return toSummary(application);
    }

    private String statusLabel(ApplicationStatus status) {
        return switch (status) {
            case APPLIED -> "applied";
            case UNDER_REVIEW -> "under review";
            case REJECTED -> "not selected";
            case WITHDRAWN -> "withdrawn";
        };
    }

    @Transactional(readOnly = true)
    public List<ApplicationSummary> getMine(UUID candidateId) {
        return applicationRepository.findByCandidateIdOrderByAppliedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    /** Backs the "view applicants" page reached from company/job-postings — unlike getMine()
     * above (candidate-facing, no candidate identity needed), a company needs to see who applied,
     * so this returns candidate details joined in from auth's User/CandidateProfile rather than
     * just the application record itself. contactNumber is null unless this company has already
     * revealed it (see CandidateSearchService.revealContact) — same reveal-gated pattern as
     * candidate search, reused via the same /api/company/candidates/{userId}/reveal-contact
     * endpoint from this page. */
    @Transactional(readOnly = true)
    public List<JobApplicantSummary> getForJob(UUID jobId, UUID companyId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        if (!job.getCompanyId().equals(companyId)) {
            throw new ApplicationAccessDeniedException();
        }
        List<Application> applications = applicationRepository.findByJobIdOrderByAppliedAtDesc(jobId);
        List<UUID> candidateIds = applications.stream().map(Application::getCandidateId).toList();

        Map<UUID, User> usersById = userRepository.findAllById(candidateIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<UUID, CandidateProfile> profilesById = candidateProfileRepository.findByUserIdIn(candidateIds).stream()
                .collect(Collectors.toMap(CandidateProfile::getUserId, profile -> profile));
        Set<UUID> revealedCandidateIds = candidateContactRevealRepository.findByCompanyId(companyId).stream()
                .map(CandidateContactReveal::getCandidateId)
                .collect(Collectors.toSet());

        return applications.stream()
                .filter(application -> usersById.containsKey(application.getCandidateId()))
                .map(application -> toApplicantSummary(
                        application,
                        usersById.get(application.getCandidateId()),
                        profilesById.get(application.getCandidateId()),
                        revealedCandidateIds.contains(application.getCandidateId())))
                .toList();
    }

    private JobApplicantSummary toApplicantSummary(
            Application application, User user, CandidateProfile profile, boolean contactRevealed) {
        return new JobApplicantSummary(
                application.getId(),
                user.getId(),
                user.getFullName(),
                profile == null ? null : profile.getTitle(),
                profile == null ? null : profile.getLocation(),
                profile == null ? List.of() : profile.getSkills(),
                application.getStatus(),
                application.getAppliedAt(),
                contactRevealed && profile != null ? profile.getMobile() : null);
    }

    private ApplicationSummary toSummary(Application application) {
        return new ApplicationSummary(
                application.getId(),
                application.getJobId(),
                application.getJobTitle(),
                application.getCompanyName(),
                application.getStatus(),
                application.getAppliedAt());
    }
}
