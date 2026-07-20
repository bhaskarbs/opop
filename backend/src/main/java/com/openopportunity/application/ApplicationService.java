package com.openopportunity.application;

import com.openopportunity.application.dto.ApplicationSummary;
import com.openopportunity.application.exception.ApplicationAccessDeniedException;
import com.openopportunity.application.exception.ApplicationNotFoundException;
import com.openopportunity.application.exception.DuplicateApplicationException;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final NotificationService notificationService;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            JobRepository jobRepository,
            NotificationService notificationService) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.notificationService = notificationService;
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

    @Transactional(readOnly = true)
    public List<ApplicationSummary> getForJob(UUID jobId, UUID companyId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        if (!job.getCompanyId().equals(companyId)) {
            throw new ApplicationAccessDeniedException();
        }
        return applicationRepository.findByJobIdOrderByAppliedAtDesc(jobId).stream()
                .map(this::toSummary)
                .toList();
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
