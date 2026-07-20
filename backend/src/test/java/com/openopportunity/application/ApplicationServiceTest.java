package com.openopportunity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.application.dto.ApplicationSummary;
import com.openopportunity.application.exception.ApplicationAccessDeniedException;
import com.openopportunity.application.exception.ApplicationNotFoundException;
import com.openopportunity.application.exception.DuplicateApplicationException;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.notification.NotificationService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private NotificationService notificationService;

    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(applicationRepository, jobRepository, notificationService);
    }

    private Job activeJob(UUID companyId) {
        return new Job(
                companyId,
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE);
    }

    @Test
    void applySucceedsAndIncrementsApplicantCount() {
        UUID candidateId = UUID.randomUUID();
        Job job = activeJob(UUID.randomUUID());
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(applicationRepository.existsByJobIdAndCandidateId(job.getId(), candidateId)).thenReturn(false);

        ApplicationSummary summary = applicationService.apply(candidateId, job.getId());

        assertThat(summary.status()).isEqualTo(ApplicationStatus.APPLIED);
        assertThat(summary.jobTitle()).isEqualTo("Senior Frontend Developer");
        assertThat(job.getApplicantCount()).isEqualTo(1);
        verify(applicationRepository).save(any(Application.class));
        verify(jobRepository).save(job);
    }

    @Test
    void applyRejectsDuplicateApplication() {
        UUID candidateId = UUID.randomUUID();
        Job job = activeJob(UUID.randomUUID());
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(applicationRepository.existsByJobIdAndCandidateId(job.getId(), candidateId)).thenReturn(true);

        assertThatThrownBy(() -> applicationService.apply(candidateId, job.getId()))
                .isInstanceOf(DuplicateApplicationException.class);
    }

    @Test
    void applyRejectsDraftJob() {
        UUID candidateId = UUID.randomUUID();
        Job draft = new Job(
                UUID.randomUUID(), "Vertex Robotics", "Draft Role", EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR, WorkMode.HYBRID, "Bengaluru", null, null, null, "desc",
                List.of(), List.of(), List.of(), JobStatus.DRAFT);
        when(jobRepository.findById(draft.getId())).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> applicationService.apply(candidateId, draft.getId()))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void applyRejectsMissingJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.apply(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void withdrawSetsStatusAndDecrementsApplicantCount() {
        UUID candidateId = UUID.randomUUID();
        Job job = activeJob(UUID.randomUUID());
        job.incrementApplicantCount();
        Application application =
                new Application(job.getId(), candidateId, job.getTitle(), job.getCompanyName());
        when(applicationRepository.findById(application.getId())).thenReturn(Optional.of(application));
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        ApplicationSummary summary = applicationService.withdraw(application.getId(), candidateId);

        assertThat(summary.status()).isEqualTo(ApplicationStatus.WITHDRAWN);
        assertThat(job.getApplicantCount()).isZero();
    }

    @Test
    void withdrawRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Application application = new Application(UUID.randomUUID(), ownerId, "Title", "Company");
        when(applicationRepository.findById(application.getId())).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> applicationService.withdraw(application.getId(), otherId))
                .isInstanceOf(ApplicationAccessDeniedException.class);
    }

    @Test
    void withdrawRejectsMissingApplication() {
        when(applicationRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.withdraw(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(ApplicationNotFoundException.class);
    }

    @Test
    void withdrawTwiceDoesNotDoubleDecrementApplicantCount() {
        UUID candidateId = UUID.randomUUID();
        Job job = activeJob(UUID.randomUUID());
        job.incrementApplicantCount();
        Application application =
                new Application(job.getId(), candidateId, job.getTitle(), job.getCompanyName());
        when(applicationRepository.findById(application.getId())).thenReturn(Optional.of(application));
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        applicationService.withdraw(application.getId(), candidateId);
        applicationService.withdraw(application.getId(), candidateId);

        assertThat(job.getApplicantCount()).isZero();
        verify(jobRepository, times(1)).save(job);
    }

    @Test
    void updateStatusRejectsNonOwningCompany() {
        UUID ownerCompanyId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job job = activeJob(ownerCompanyId);
        Application application =
                new Application(job.getId(), UUID.randomUUID(), job.getTitle(), job.getCompanyName());
        when(applicationRepository.findById(application.getId())).thenReturn(Optional.of(application));
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> applicationService.updateStatus(
                        application.getId(), otherCompanyId, ApplicationStatus.UNDER_REVIEW))
                .isInstanceOf(ApplicationAccessDeniedException.class);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void getForJobRejectsNonOwningCompany() {
        UUID ownerCompanyId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job job = activeJob(ownerCompanyId);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> applicationService.getForJob(job.getId(), otherCompanyId))
                .isInstanceOf(ApplicationAccessDeniedException.class);
    }
}
