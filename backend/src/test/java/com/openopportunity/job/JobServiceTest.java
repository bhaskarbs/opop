package com.openopportunity.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.analytics.AnalyticsService;
import com.openopportunity.application.ApplicationRepository;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.CompanySubscription;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.CompanySubscriptionRepository;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import com.openopportunity.job.dto.JobSummary;
import com.openopportunity.job.exception.CompanyNotEligibleToPostJobsException;
import com.openopportunity.job.exception.InvalidJobStatusTransitionException;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import com.openopportunity.savedjob.SavedJobRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class JobServiceTest {

    @Mock
    private JobRepository jobRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private CompanySubscriptionRepository companySubscriptionRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private SavedJobRepository savedJobRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AnalyticsService analyticsService;

    private JobService jobService;

    @BeforeEach
    void setUp() {
        jobService = new JobService(
                jobRepository,
                userRepository,
                companyProfileRepository,
                companySubscriptionRepository,
                applicationRepository,
                savedJobRepository,
                notificationService,
                analyticsService);
    }

    private CompanyProfile eligibleProfile(UUID companyId) {
        CompanyProfile profile = new CompanyProfile(
                companyId, "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory", "9876543210", null);
        profile.verify();
        return profile;
    }

    private JobRequest sampleRequest(JobStatus status) {
        return new JobRequest(
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                BigDecimal.valueOf(18),
                BigDecimal.valueOf(24),
                null,
                "Lead the dashboard rebuild.",
                List.of("Own delivery", "Mentor engineers"),
                List.of("5+ years React"),
                List.of("React", "TypeScript"),
                status);
    }

    @Test
    void createLooksUpCompanyNameAndStartsWithZeroApplicants() {
        UUID companyId = UUID.randomUUID();
        User company = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(companyId)).thenReturn(Optional.of(company));
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleProfile(companyId)));

        JobDetail detail = jobService.create(companyId, sampleRequest(JobStatus.PENDING_APPROVAL));

        assertThat(detail.companyName()).isEqualTo("Vertex Robotics");
        assertThat(detail.applicantCount()).isZero();
        assertThat(detail.status()).isEqualTo(JobStatus.PENDING_APPROVAL);
    }

    @Test
    void createNotifiesAdminsWhenSubmittedForApproval() {
        UUID companyId = UUID.randomUUID();
        User company = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(companyId)).thenReturn(Optional.of(company));
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleProfile(companyId)));

        jobService.create(companyId, sampleRequest(JobStatus.PENDING_APPROVAL));

        verify(notificationService)
                .notifyAdmins(eq(NotificationType.JOB_PENDING_APPROVAL), any(), any());
    }

    @Test
    void createDoesNotNotifyAdminsForADraft() {
        UUID companyId = UUID.randomUUID();
        User company = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(companyId)).thenReturn(Optional.of(company));
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleProfile(companyId)));

        jobService.create(companyId, sampleRequest(JobStatus.DRAFT));

        verify(notificationService, never()).notifyAdmins(any(), any(), any());
    }

    @Test
    void createRejectsClientSuppliedActiveOrRejectedStatus() {
        UUID companyId = UUID.randomUUID();

        assertThatThrownBy(() -> jobService.create(companyId, sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(InvalidJobStatusTransitionException.class);
        assertThatThrownBy(() -> jobService.create(companyId, sampleRequest(JobStatus.REJECTED)))
                .isInstanceOf(InvalidJobStatusTransitionException.class);
    }

    @Test
    void createRejectsIncompleteCompanyProfile() {
        UUID companyId = UUID.randomUUID();
        // Blank profile, as left by AuthService.loginWithGoogleAsCompany right after sign-in.
        CompanyProfile blank = new CompanyProfile(companyId, null, null, null, null, null, null, null, null, null);
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(blank));

        assertThatThrownBy(() -> jobService.create(companyId, sampleRequest(JobStatus.PENDING_APPROVAL)))
                .isInstanceOf(CompanyNotEligibleToPostJobsException.class);
    }

    @Test
    void createRejectsUnverifiedCompanyProfile() {
        UUID companyId = UUID.randomUUID();
        CompanyProfile pending = new CompanyProfile(
                companyId, "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory", "9876543210", null);
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(pending));

        assertThatThrownBy(() -> jobService.create(companyId, sampleRequest(JobStatus.PENDING_APPROVAL)))
                .isInstanceOf(CompanyNotEligibleToPostJobsException.class);
    }

    @Test
    void updateRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job job = new Job(
                ownerId,
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
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() ->
                        jobService.update(job.getId(), otherCompanyId, sampleRequest(JobStatus.PENDING_APPROVAL)))
                .isInstanceOf(JobAccessDeniedException.class);
    }

    @Test
    void updateRejectsUnknownJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.update(
                        UUID.randomUUID(), UUID.randomUUID(), sampleRequest(JobStatus.PENDING_APPROVAL)))
                .isInstanceOf(JobNotFoundException.class);
    }

    private Job jobWithStatus(UUID companyId, JobStatus status) {
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
                status);
    }

    @Test
    void updateNotifiesAdminsWhenSubmittingADraftForApproval() {
        UUID companyId = UUID.randomUUID();
        Job job = jobWithStatus(companyId, JobStatus.DRAFT);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(userRepository.findById(companyId))
                .thenReturn(Optional.of(new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY)));

        jobService.update(job.getId(), companyId, sampleRequest(JobStatus.PENDING_APPROVAL));

        verify(notificationService)
                .notifyAdmins(eq(NotificationType.JOB_PENDING_APPROVAL), any(), any());
    }

    @Test
    void updateDoesNotReNotifyAdminsWhenAlreadyPendingApproval() {
        UUID companyId = UUID.randomUUID();
        Job job = jobWithStatus(companyId, JobStatus.PENDING_APPROVAL);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        jobService.update(job.getId(), companyId, sampleRequest(JobStatus.PENDING_APPROVAL));

        verify(notificationService, never()).notifyAdmins(any(), any(), any());
    }

    @Test
    void deleteRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job job = new Job(
                ownerId,
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
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.delete(job.getId(), otherCompanyId))
                .isInstanceOf(JobAccessDeniedException.class);
    }

    @Test
    void adminDeleteRemovesTheJobAndItsApplicationsAndSavedBookmarksRegardlessOfOwner() {
        UUID ownerId = UUID.randomUUID();
        Job job = new Job(
                ownerId,
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
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        jobService.adminDelete(job.getId());

        verify(applicationRepository).deleteByJobId(job.getId());
        verify(savedJobRepository).deleteByJobId(job.getId());
        verify(jobRepository).delete(job);
    }

    @Test
    void adminDeleteRejectsUnknownJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.adminDelete(UUID.randomUUID()))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void getRejectsDraftJobFromNonOwner() {
        UUID companyId = UUID.randomUUID();
        Job draft = new Job(
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
                JobStatus.DRAFT);
        when(jobRepository.findById(draft.getId())).thenReturn(Optional.of(draft));

        assertThatThrownBy(() -> jobService.get(draft.getId(), UUID.randomUUID()))
                .isInstanceOf(JobNotFoundException.class);
        assertThatThrownBy(() -> jobService.get(draft.getId(), null)).isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void getAllowsOwnerToViewTheirOwnDraftJob() {
        UUID companyId = UUID.randomUUID();
        Job draft = new Job(
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
                JobStatus.DRAFT);
        when(jobRepository.findById(draft.getId())).thenReturn(Optional.of(draft));

        JobDetail detail = jobService.get(draft.getId(), companyId);

        assertThat(detail.status()).isEqualTo(JobStatus.DRAFT);
    }

    @Test
    void getRejectsMissingJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.get(UUID.randomUUID(), null))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void getPendingReturnsFullDetailNotJustTheSearchSummary() {
        Job job = new Job(
                UUID.randomUUID(),
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "Lead the dashboard rebuild.",
                List.of("Own delivery"),
                List.of("5+ years React"),
                List.of("React"),
                JobStatus.PENDING_APPROVAL);
        when(jobRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(job));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());

        List<JobDetail> pending = jobService.getPending(null);

        assertThat(pending).hasSize(1);
        assertThat(pending.get(0).aboutRole()).isEqualTo("Lead the dashboard rebuild.");
        assertThat(pending.get(0).responsibilities()).containsExactly("Own delivery");
        assertThat(pending.get(0).requirements()).containsExactly("5+ years React");
    }

    @Test
    void featuredPostingsOutrankPromotedCompanyPostingsWhichOutrankEveryoneElse() {
        UUID plainCompanyId = UUID.randomUUID();
        UUID promotedCompanyId = UUID.randomUUID();
        UUID featuredCompanyId = UUID.randomUUID();

        Job plainJob = new Job(
                plainCompanyId, "Plain Co", "Plain Role", EmploymentType.FULL_TIME, ExperienceLevel.SENIOR,
                WorkMode.HYBRID, "Bengaluru", null, null, null, "About", List.of(), List.of(), List.of(),
                JobStatus.ACTIVE);
        Job promotedJob = new Job(
                promotedCompanyId, "Promoted Co", "Promoted Role", EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR, WorkMode.HYBRID, "Bengaluru", null, null, null, "About", List.of(),
                List.of(), List.of(), JobStatus.ACTIVE);
        Job featuredJob = new Job(
                featuredCompanyId, "Featured Co", "Featured Role", EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR, WorkMode.HYBRID, "Bengaluru", null, null, null, "About", List.of(),
                List.of(), List.of(), JobStatus.ACTIVE);
        featuredJob.feature();

        when(jobRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(plainJob, promotedJob, featuredJob));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());
        CompanySubscription promotedSubscription =
                new CompanySubscription(promotedCompanyId, CompanySubscriptionPlan.GROWTH);
        promotedSubscription.changePlan(
                CompanySubscriptionPlan.GROWTH, Instant.now(), Instant.now().plus(30, ChronoUnit.DAYS));
        when(companySubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(
                        eq(CompanySubscriptionPlan.FREE), any()))
                .thenReturn(List.of(promotedSubscription));

        List<JobSummary> results = jobService.search(null, null, null, null, null, "relevant");

        assertThat(results)
                .extracting(JobSummary::id)
                .containsExactly(featuredJob.getId(), promotedJob.getId(), plainJob.getId());
        assertThat(results.get(0).isFeatured()).isTrue();
        assertThat(results.get(1).isPromoted()).isTrue();
        assertThat(results.get(2).isFeatured()).isFalse();
        assertThat(results.get(2).isPromoted()).isFalse();
    }

    @Test
    void getByIdsReturnsEmptyListWithoutQueryingForEmptyInput() {
        List<JobSummary> result = jobService.getByIds(List.of());

        assertThat(result).isEmpty();
        verify(jobRepository, never()).findAllById(any());
    }

    @Test
    void getByIdsSilentlyDropsIdsForJobsThatNoLongerExist() {
        UUID existingId = UUID.randomUUID();
        UUID deletedId = UUID.randomUUID();
        Job job = new Job(
                UUID.randomUUID(),
                "Vertex Robotics",
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "Lead the dashboard rebuild.",
                List.of("Own delivery"),
                List.of("5+ years React"),
                List.of("React"),
                JobStatus.ACTIVE);
        when(jobRepository.findAllById(List.of(existingId, deletedId))).thenReturn(List.of(job));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());

        List<JobSummary> result = jobService.getByIds(List.of(existingId, deletedId));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("Senior Frontend Developer");
    }
}
