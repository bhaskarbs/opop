package com.openopportunity.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import com.openopportunity.search.JobSearchProvider;
import com.openopportunity.storage.FileStorageService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

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
    private NewJobMatchEmailService newJobMatchEmailService;

    @Mock
    private JobAlertMatchEmailService jobAlertMatchEmailService;

    @Mock
    private JobSearchProvider jobSearchProvider;

    @Mock
    private FileStorageService fileStorageService;

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
                newJobMatchEmailService,
                jobAlertMatchEmailService,
                jobSearchProvider,
                Optional.empty(),
                fileStorageService,
                "sourced-jobs@openopportunity.in");
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
                null,
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

    // A company deleting its own job used to leave that job's applications/saved bookmarks
    // orphaned (only adminDelete cleaned those up) — a candidate would see their application
    // stuck at a stale status forever, pointing at a job that no longer exists. Both delete
    // paths now share the same cleanup (see the private delete(Job) in JobService).
    @Test
    void deleteByOwnerAlsoRemovesItsApplicationsAndSavedBookmarks() {
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

        jobService.delete(job.getId(), ownerId);

        verify(applicationRepository).deleteByJobId(job.getId());
        verify(savedJobRepository).deleteByJobId(job.getId());
        verify(jobRepository).delete(job);
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
    void adminCreateSucceedsForACompanyThatIsNotYetEligibleToPostItself() {
        UUID companyId = UUID.randomUUID();
        User company = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(companyId)).thenReturn(Optional.of(company));
        // No companyProfileRepository stub, and deliberately no eligibleProfile() (unverified/
        // incomplete) — unlike create(), adminCreate must not require it.

        JobDetail detail = jobService.adminCreate(companyId, sampleRequest(JobStatus.ACTIVE));

        assertThat(detail.companyName()).isEqualTo("Vertex Robotics");
        assertThat(detail.status()).isEqualTo(JobStatus.ACTIVE);
    }

    @Test
    void adminCreateAllowsDirectActiveStatusAndNotifiesMatchingCandidates() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(companyId))
                .thenReturn(Optional.of(new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY)));

        jobService.adminCreate(companyId, sampleRequest(JobStatus.ACTIVE));

        verify(newJobMatchEmailService).notifyMatchingCandidates(any());
        verify(jobAlertMatchEmailService).notifyMatchingAlerts(any());
        verify(notificationService).notify(eq(companyId), eq(NotificationType.JOB_APPROVED), any(), any());
    }

    @Test
    void adminCreateRejectsATargetThatIsNotACompanyAccount() {
        UUID candidateId = UUID.randomUUID();
        when(userRepository.findById(candidateId))
                .thenReturn(Optional.of(new User("rohan@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE)));

        assertThatThrownBy(() -> jobService.adminCreate(candidateId, sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(CompanyNotFoundException.class);
    }

    @Test
    void adminCreateRejectsAnUnknownCompanyId() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(companyId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.adminCreate(companyId, sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(CompanyNotFoundException.class);
    }

    @Test
    void adminCreateEnforcesThePostingLimitLikeAnyOtherCreationPath() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(companyId))
                .thenReturn(Optional.of(new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY)));
        when(jobRepository.countByCompanyId(companyId)).thenReturn(10L);

        assertThatThrownBy(() -> jobService.adminCreate(companyId, sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(JobPostingLimitReachedException.class);
    }

    // The one named exemption from MAX_JOB_POSTINGS_PER_COMPANY — see
    // app.jobs.unlimited-posting-company-email, matched by email regardless of which
    // create/adminCreate path is used.
    @Test
    void adminCreateExemptsTheConfiguredUnlimitedPostingCompanyFromTheLimit() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(companyId))
                .thenReturn(Optional.of(
                        new User("sourced-jobs@openopportunity.in", "hash", "OpenOpportunity Sourced Jobs", UserRole.COMPANY)));
        // Deliberately no countByCompanyId stub — the exemption must short-circuit before that
        // call, so mockito's strict stubbing would flag an unused stub here if it didn't.

        JobDetail detail = jobService.adminCreate(companyId, sampleRequest(JobStatus.ACTIVE));

        assertThat(detail.companyName()).isEqualTo("OpenOpportunity Sourced Jobs");
    }

    @Test
    void createStillEnforcesThePostingLimitForAnOrdinaryCompany() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(companyId))
                .thenReturn(Optional.of(new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY)));
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleProfile(companyId)));
        when(jobRepository.countByCompanyId(companyId)).thenReturn(10L);

        assertThatThrownBy(() -> jobService.create(companyId, sampleRequest(JobStatus.DRAFT)))
                .isInstanceOf(JobPostingLimitReachedException.class);
    }

    @Test
    void createExemptsTheConfiguredUnlimitedPostingCompanyFromTheLimit() {
        UUID companyId = UUID.randomUUID();
        when(userRepository.findById(companyId))
                .thenReturn(Optional.of(
                        new User("sourced-jobs@openopportunity.in", "hash", "OpenOpportunity Sourced Jobs", UserRole.COMPANY)));
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleProfile(companyId)));
        // Deliberately no countByCompanyId stub — the exemption must short-circuit before that
        // call, so mockito's strict stubbing would flag an unused stub here if it didn't.

        JobDetail detail = jobService.create(companyId, sampleRequest(JobStatus.DRAFT));

        assertThat(detail.companyName()).isEqualTo("OpenOpportunity Sourced Jobs");
    }

    @Test
    void adminUpdateEditsAJobRegardlessOfWhichCompanyOwnsIt() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobRequest edited = new JobRequest(
                "Staff Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE);
        JobDetail detail = jobService.adminUpdate(job.getId(), edited);

        assertThat(detail.title()).isEqualTo("Staff Frontend Developer");
    }

    @Test
    void adminUpdateNotifiesMatchingCandidatesWhenTransitioningToActive() {
        UUID companyId = UUID.randomUUID();
        Job job = jobWithStatus(companyId, JobStatus.PENDING_APPROVAL);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        jobService.adminUpdate(job.getId(), sampleRequest(JobStatus.ACTIVE));

        verify(newJobMatchEmailService).notifyMatchingCandidates(any());
        verify(jobAlertMatchEmailService).notifyMatchingAlerts(any());
    }

    @Test
    void adminUpdateRejectsUnknownJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.adminUpdate(UUID.randomUUID(), sampleRequest(JobStatus.ACTIVE)))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void adminGetReturnsANonActiveJobRegardlessOfOwner() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.DRAFT);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobDetail detail = jobService.adminGet(job.getId());

        assertThat(detail.id()).isEqualTo(job.getId());
    }

    @Test
    void adminGetRejectsUnknownJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobService.adminGet(UUID.randomUUID()))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void adminUpdateBrandingOverridesTheDisplayedCompanyName() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobDetail detail =
                jobService.adminUpdateBranding(job.getId(), new AdminJobBrandingRequest("Acme Talent Partners"));

        assertThat(detail.companyName()).isEqualTo("Acme Talent Partners");
    }

    @Test
    void adminUpdateBrandingBlankNameClearsTheOverride() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        job.updateDisplayCompanyName("Previously Overridden Name");
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobDetail detail = jobService.adminUpdateBranding(job.getId(), new AdminJobBrandingRequest("  "));

        assertThat(detail.companyName()).isEqualTo(job.getCompanyName());
    }

    @Test
    void adminUpdateBrandingRejectsUnknownJob() {
        when(jobRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(
                        () -> jobService.adminUpdateBranding(UUID.randomUUID(), new AdminJobBrandingRequest("X")))
                .isInstanceOf(JobNotFoundException.class);
    }

    @Test
    void adminUploadLogoStoresAResizedImageAndPointsTheUrlAtTheJobLogoEndpoint() throws IOException {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(fileStorageService.store(any(byte[].class), anyString(), eq("job-logos/" + job.getId())))
                .thenReturn("job-logos/" + job.getId() + "/resized.jpg");

        BufferedImage original = new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream originalBytes = new ByteArrayOutputStream();
        ImageIO.write(original, "jpg", originalBytes);
        MockMultipartFile file =
                new MockMultipartFile("file", "logo.jpg", "image/jpeg", originalBytes.toByteArray());

        JobDetail detail = jobService.adminUploadLogo(job.getId(), file);

        ArgumentCaptor<byte[]> storedContent = ArgumentCaptor.forClass(byte[].class);
        verify(fileStorageService)
                .store(storedContent.capture(), eq("logo.jpg"), eq("job-logos/" + job.getId()));
        assertThat(storedContent.getValue().length).isLessThan(originalBytes.size());
        assertThat(detail.companyLogoUrl()).isEqualTo("/api/jobs/" + job.getId() + "/logo");
    }

    @Test
    void adminUploadLogoRejectsAFileWhoseBytesArentActuallyAnImage() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        MockMultipartFile file =
                new MockMultipartFile("file", "logo.jpg", "image/jpeg", "not actually an image".getBytes());

        assertThatThrownBy(() -> jobService.adminUploadLogo(job.getId(), file))
                .isInstanceOf(InvalidJobLogoException.class);
    }

    @Test
    void adminRemoveLogoRevertsToTheCompanysOwnLogo() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        job.updateLogo("job-logos/" + job.getId() + "/logo.jpg", "image/jpeg");
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobDetail detail = jobService.adminRemoveLogo(job.getId());

        assertThat(detail.companyLogoUrl()).isNull();
    }

    @Test
    void getLogoReturnsTheStoredResourceWhenTheJobHasACustomLogo() throws IOException {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        job.updateLogo("job-logos/" + job.getId() + "/logo.jpg", "image/jpeg");
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        org.springframework.core.io.Resource resource =
                new org.springframework.core.io.ByteArrayResource("fake-image-bytes".getBytes());
        when(fileStorageService.load("job-logos/" + job.getId() + "/logo.jpg")).thenReturn(resource);

        JobService.JobLogoContent logo = jobService.getLogo(job.getId());

        assertThat(logo.contentType()).isEqualTo("image/jpeg");
        assertThat(logo.resource()).isSameAs(resource);
    }

    @Test
    void getLogoRejectsAJobWithNoCustomLogo() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.getLogo(job.getId())).isInstanceOf(JobLogoNotFoundException.class);
    }

    @Test
    void updateBrandingOverridesTheDisplayedCompanyNameForTheOwningCompany() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobDetail detail = jobService.updateBranding(
                job.getId(), ownerId, new AdminJobBrandingRequest("Acme Talent Partners"));

        assertThat(detail.companyName()).isEqualTo("Acme Talent Partners");
    }

    @Test
    void updateBrandingRejectsACompanyThatDoesNotOwnTheJob() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.updateBranding(
                        job.getId(), UUID.randomUUID(), new AdminJobBrandingRequest("Acme Talent Partners")))
                .isInstanceOf(JobAccessDeniedException.class);
    }

    @Test
    void uploadLogoStoresAResizedImageForTheOwningCompany() throws IOException {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        when(fileStorageService.store(any(byte[].class), anyString(), eq("job-logos/" + job.getId())))
                .thenReturn("job-logos/" + job.getId() + "/resized.jpg");

        BufferedImage original = new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream originalBytes = new ByteArrayOutputStream();
        ImageIO.write(original, "jpg", originalBytes);
        MockMultipartFile file =
                new MockMultipartFile("file", "logo.jpg", "image/jpeg", originalBytes.toByteArray());

        JobDetail detail = jobService.uploadLogo(job.getId(), ownerId, file);

        assertThat(detail.companyLogoUrl()).isEqualTo("/api/jobs/" + job.getId() + "/logo");
    }

    @Test
    void uploadLogoRejectsACompanyThatDoesNotOwnTheJob() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));
        MockMultipartFile file =
                new MockMultipartFile("file", "logo.jpg", "image/jpeg", "irrelevant".getBytes());

        assertThatThrownBy(() -> jobService.uploadLogo(job.getId(), UUID.randomUUID(), file))
                .isInstanceOf(JobAccessDeniedException.class);
    }

    @Test
    void removeLogoRevertsToTheCompanysOwnLogoForTheOwningCompany() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        job.updateLogo("job-logos/" + job.getId() + "/logo.jpg", "image/jpeg");
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        JobDetail detail = jobService.removeLogo(job.getId(), ownerId);

        assertThat(detail.companyLogoUrl()).isNull();
    }

    @Test
    void removeLogoRejectsACompanyThatDoesNotOwnTheJob() {
        UUID ownerId = UUID.randomUUID();
        Job job = jobWithStatus(ownerId, JobStatus.ACTIVE);
        job.updateLogo("job-logos/" + job.getId() + "/logo.jpg", "image/jpeg");
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.removeLogo(job.getId(), UUID.randomUUID()))
                .isInstanceOf(JobAccessDeniedException.class);
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
    void adminSearchReturnsJobsRegardlessOfStatusWhenNoStatusFilterIsGiven() {
        Job draft = jobWithStatus(UUID.randomUUID(), JobStatus.DRAFT);
        Job active = jobWithStatus(UUID.randomUUID(), JobStatus.ACTIVE);
        when(jobRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(draft, active));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());

        AdminJobSearchResult result = jobService.adminSearch(null, null, 0, 10);

        assertThat(result.jobs())
                .extracting(job -> job.summary().id())
                .containsExactly(draft.getId(), active.getId());
        assertThat(result.totalCount()).isEqualTo(2);
    }

    @Test
    void adminSearchIncludesTheRealCompanyNameAlongsideTheDisplayOverride() {
        Job job = jobWithStatus(UUID.randomUUID(), JobStatus.ACTIVE);
        job.updateDisplayCompanyName("Acme Talent Partners");
        when(jobRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(job));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());

        AdminJobSearchResult result = jobService.adminSearch(null, null, 0, 10);

        assertThat(result.jobs().get(0).summary().companyName()).isEqualTo("Acme Talent Partners");
        assertThat(result.jobs().get(0).realCompanyName()).isEqualTo(job.getCompanyName());
    }

    @Test
    void adminSearchPagesResultsLikeTheOtherSearchEndpoints() {
        Job first = jobWithStatus(UUID.randomUUID(), JobStatus.ACTIVE);
        Job second = jobWithStatus(UUID.randomUUID(), JobStatus.DRAFT);
        when(jobRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(first, second));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());

        AdminJobSearchResult result = jobService.adminSearch(null, null, 0, 1);

        assertThat(result.jobs()).extracting(job -> job.summary().id()).containsExactly(first.getId());
        assertThat(result.totalCount()).isEqualTo(2);
        assertThat(result.totalPages()).isEqualTo(2);
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

        List<Job> orderedJobs = List.of(plainJob, promotedJob, featuredJob);
        when(jobSearchProvider.searchIds(any(), any(), any(), any(), any(), any()))
                .thenReturn(orderedJobs.stream().map(Job::getId).toList());
        when(jobRepository.findAllById(any())).thenReturn(orderedJobs);
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());
        CompanySubscription promotedSubscription =
                new CompanySubscription(promotedCompanyId, CompanySubscriptionPlan.GROWTH);
        promotedSubscription.changePlan(
                CompanySubscriptionPlan.GROWTH, Instant.now(), Instant.now().plus(30, ChronoUnit.DAYS));
        when(companySubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(
                        eq(CompanySubscriptionPlan.FREE), any()))
                .thenReturn(List.of(promotedSubscription));

        JobSearchResult result = jobService.search(null, null, null, null, null, "relevant", 0, 10);

        assertThat(result.jobs())
                .extracting(JobSummary::id)
                .containsExactly(featuredJob.getId(), promotedJob.getId(), plainJob.getId());
        assertThat(result.jobs().get(0).isFeatured()).isTrue();
        assertThat(result.jobs().get(1).isPromoted()).isTrue();
        assertThat(result.jobs().get(2).isFeatured()).isFalse();
        assertThat(result.jobs().get(2).isPromoted()).isFalse();
        assertThat(result.totalCount()).isEqualTo(3);
        assertThat(result.totalPages()).isEqualTo(1);
    }

    @Test
    void searchSlicesTheRankedResultsToTheRequestedPageAndCapsAnOversizedPageSize() {
        List<Job> jobs = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            jobs.add(new Job(
                    UUID.randomUUID(), "Co " + i, "Role " + i, EmploymentType.FULL_TIME,
                    ExperienceLevel.SENIOR, WorkMode.HYBRID, "Bengaluru", null, null, null, "About",
                    List.of(), List.of(), List.of(), JobStatus.ACTIVE));
        }
        when(jobSearchProvider.searchIds(any(), any(), any(), any(), any(), any()))
                .thenReturn(jobs.stream().map(Job::getId).toList());
        when(jobRepository.findAllById(any())).thenReturn(jobs);
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of());
        when(companySubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(
                        eq(CompanySubscriptionPlan.FREE), any()))
                .thenReturn(List.of());

        JobSearchResult firstPage = jobService.search(null, null, null, null, null, "relevant", 0, 2);
        JobSearchResult secondPage = jobService.search(null, null, null, null, null, "relevant", 1, 2);
        // A page size beyond MAX_SEARCH_PAGE_SIZE (50) gets clamped rather than trusted verbatim.
        JobSearchResult oversizedPage = jobService.search(null, null, null, null, null, "relevant", 0, 10_000);

        assertThat(firstPage.jobs()).hasSize(2);
        assertThat(firstPage.totalCount()).isEqualTo(5);
        assertThat(firstPage.totalPages()).isEqualTo(3);
        assertThat(secondPage.jobs()).hasSize(2);
        assertThat(firstPage.jobs()).doesNotContainAnyElementsOf(secondPage.jobs());
        assertThat(oversizedPage.size()).isEqualTo(50);
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
