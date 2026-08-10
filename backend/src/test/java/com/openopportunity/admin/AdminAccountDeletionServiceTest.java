package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.application.Application;
import com.openopportunity.application.ApplicationRepository;
import com.openopportunity.auth.CandidateCertification;
import com.openopportunity.auth.CandidateCertificationRepository;
import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyCertificate;
import com.openopportunity.auth.CompanyCertificateRepository;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.BillingTransactionRepository;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingTransactionRepository;
import com.openopportunity.billing.CompanySubscriptionRepository;
import com.openopportunity.idea.Idea;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaService;
import com.openopportunity.idea.IdeaStage;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobService;
import com.openopportunity.jobalert.JobAlertRepository;
import com.openopportunity.mockinterview.MockInterviewSession;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import com.openopportunity.notification.NotificationRepository;
import com.openopportunity.savedjob.SavedJobRepository;
import com.openopportunity.storage.FileStorageService;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminAccountDeletionServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private CandidateCertificationRepository candidateCertificationRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private CompanyCertificateRepository companyCertificateRepository;

    @Mock
    private MockInterviewSessionRepository mockInterviewSessionRepository;

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private SavedJobRepository savedJobRepository;

    @Mock
    private JobAlertRepository jobAlertRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private IdeaRepository ideaRepository;

    @Mock
    private IdeaInterestRepository ideaInterestRepository;

    @Mock
    private IdeaService ideaService;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private JobService jobService;

    @Mock
    private CandidateSubscriptionRepository candidateSubscriptionRepository;

    @Mock
    private BillingTransactionRepository billingTransactionRepository;

    @Mock
    private CompanySubscriptionRepository companySubscriptionRepository;

    @Mock
    private CompanyBillingTransactionRepository companyBillingTransactionRepository;

    @Mock
    private FileStorageService fileStorageService;

    private AdminAccountDeletionService service;

    @BeforeEach
    void setUp() {
        service = new AdminAccountDeletionService(
                userRepository,
                candidateProfileRepository,
                candidateCertificationRepository,
                companyProfileRepository,
                companyCertificateRepository,
                mockInterviewSessionRepository,
                applicationRepository,
                savedJobRepository,
                jobAlertRepository,
                notificationRepository,
                ideaRepository,
                ideaInterestRepository,
                ideaService,
                jobRepository,
                jobService,
                candidateSubscriptionRepository,
                billingTransactionRepository,
                companySubscriptionRepository,
                companyBillingTransactionRepository,
                fileStorageService);
    }

    @Test
    void deleteCandidateRejectsUnknownUser() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteCandidate(UUID.randomUUID()))
                .isInstanceOf(AdminUserNotFoundException.class);
    }

    @Test
    void deleteCandidateRejectsANonCandidateUser() {
        UUID id = UUID.randomUUID();
        User company = new User("company@example.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(id)).thenReturn(Optional.of(company));

        assertThatThrownBy(() -> service.deleteCandidate(id)).isInstanceOf(AdminUserNotFoundException.class);
    }

    @Test
    void deleteCandidateDeletesFilesDecrementsApplicantCountsAndCascadesEverything() throws Exception {
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        UUID candidateId = candidate.getId();
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        CandidateProfile profile = new CandidateProfile(candidateId, "9876543210", List.of("Java"), null);
        profile.updateResume("resume.pdf", "resume-key-1", 2048L, java.time.Instant.now());
        profile.updatePhoto("photo-key-1", "image/png");
        when(candidateProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(profile));

        MockInterviewSession session = new MockInterviewSession(
                candidateId, 5, 300, "video-key-1", "video/webm", 1024L, "thumb-key-1", "image/png");
        when(mockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc(candidateId))
                .thenReturn(List.of(session));

        CandidateCertification certification = new CandidateCertification(
                candidateId, "AWS Certified", "AWS-123", "https://aws.example.com/cert", "cert-logo-key-1", "image/png");
        when(candidateCertificationRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId))
                .thenReturn(List.of(certification));

        Job job = new Job(
                UUID.randomUUID(), "Vertex Robotics", "Backend Engineer",
                com.openopportunity.job.EmploymentType.FULL_TIME, com.openopportunity.job.ExperienceLevel.SENIOR,
                com.openopportunity.job.WorkMode.HYBRID, "Bengaluru", null, null, null, "desc", List.of(),
                List.of(), List.of(), com.openopportunity.job.JobStatus.ACTIVE);
        Application application = new Application(job.getId(), candidateId, job.getTitle(), job.getCompanyName());
        when(applicationRepository.findByCandidateIdOrderByAppliedAtDesc(candidateId))
                .thenReturn(List.of(application));
        when(jobRepository.findById(job.getId())).thenReturn(Optional.of(job));

        Idea idea = new Idea(
                candidateId, "Rohan Mehta", UserRole.CANDIDATE, "Idea title", "Fintech", IdeaStage.CONCEPT,
                "Problem", "Solution", "Target market", null, null, null, null, null, "candidate@example.com");
        when(ideaRepository.findBySubmitterIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of(idea));

        service.deleteCandidate(candidateId);

        verify(fileStorageService).delete("resume-key-1");
        verify(fileStorageService).delete("photo-key-1");
        verify(fileStorageService).delete("video-key-1");
        verify(fileStorageService).delete("thumb-key-1");
        verify(fileStorageService).delete("cert-logo-key-1");

        assertThat(job.getApplicantCount()).isZero();
        verify(jobRepository).save(job);
        verify(applicationRepository).deleteByCandidateId(candidateId);
        verify(mockInterviewSessionRepository).deleteByCandidateId(candidateId);
        verify(savedJobRepository).deleteByCandidateId(candidateId);
        verify(jobAlertRepository).deleteByCandidateId(candidateId);
        verify(notificationRepository).deleteByRecipientUserId(candidateId);
        verify(ideaService).adminDelete(idea.getId());
        verify(ideaInterestRepository).deleteByInterestedUserId(candidateId);
        verify(billingTransactionRepository).deleteByCandidateId(candidateId);
        verify(candidateProfileRepository).delete(profile);
        verify(userRepository).delete(candidate);
    }

    @Test
    void deleteCompanyRejectsUnknownUser() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteCompany(UUID.randomUUID()))
                .isInstanceOf(AdminUserNotFoundException.class);
    }

    @Test
    void deleteCompanyRejectsANonCompanyUser() {
        UUID id = UUID.randomUUID();
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(userRepository.findById(id)).thenReturn(Optional.of(candidate));

        assertThatThrownBy(() -> service.deleteCompany(id)).isInstanceOf(AdminUserNotFoundException.class);
    }

    @Test
    void deleteCompanyDeletesFilesAndCascadesJobsAndIdeas() throws Exception {
        User company = new User("company@example.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        UUID companyId = company.getId();
        when(userRepository.findById(companyId)).thenReturn(Optional.of(company));

        CompanyProfile profile = new CompanyProfile(
                companyId, "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory",
                "9876543210", null);
        profile.updateLogo("logo-key-1", "image/png");
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(profile));

        CompanyCertificate certificate =
                new CompanyCertificate(companyId, "cert-key-1", "application/pdf", "cert.pdf", 4096L);
        when(companyCertificateRepository.findByCompanyIdOrderByUploadedAtDesc(companyId))
                .thenReturn(List.of(certificate));

        Job job = new Job(
                companyId, "Vertex Robotics", "Backend Engineer",
                com.openopportunity.job.EmploymentType.FULL_TIME, com.openopportunity.job.ExperienceLevel.SENIOR,
                com.openopportunity.job.WorkMode.HYBRID, "Bengaluru", null, null, null, "desc", List.of(),
                List.of(), List.of(), com.openopportunity.job.JobStatus.ACTIVE);
        when(jobRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)).thenReturn(List.of(job));

        Idea idea = new Idea(
                companyId, "Vertex Robotics", UserRole.COMPANY, "Idea title", "Fintech", IdeaStage.CONCEPT,
                "Problem", "Solution", "Target market", null, null, null, null, null, "company@example.com");
        when(ideaRepository.findBySubmitterIdOrderByCreatedAtDesc(companyId)).thenReturn(List.of(idea));

        service.deleteCompany(companyId);

        verify(fileStorageService).delete("logo-key-1");
        verify(fileStorageService).delete("cert-key-1");
        verify(jobService).adminDelete(job.getId());
        verify(notificationRepository).deleteByRecipientUserId(companyId);
        verify(ideaService).adminDelete(idea.getId());
        verify(ideaInterestRepository).deleteByInterestedUserId(companyId);
        verify(companyBillingTransactionRepository).deleteByCompanyId(companyId);
        verify(companyProfileRepository).delete(profile);
        verify(userRepository).delete(company);
        // Rows for company_certificates itself are removed by the DB's ON DELETE CASCADE, not
        // application code — never deleted directly here.
        verify(companyCertificateRepository, never()).delete(any());
    }

    @Test
    void deleteAccountDispatchesByRole() {
        UUID candidateId = UUID.randomUUID();
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate), Optional.of(candidate));

        service.deleteAccount(candidateId);

        verify(userRepository, times(2)).findById(candidateId);
        verify(userRepository).delete(candidate);
    }

    @Test
    void deleteAccountRejectsAnAdminTierUser() {
        UUID id = UUID.randomUUID();
        User admin = new User("admin@example.com", "hash", "Platform Admin", UserRole.ADMIN);
        when(userRepository.findById(id)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.deleteAccount(id)).isInstanceOf(AdminUserNotFoundException.class);
    }
}
