package com.openopportunity.admin;

import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.application.ApplicationRepository;
import com.openopportunity.auth.CandidateCertification;
import com.openopportunity.auth.CandidateCertificationRepository;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyCertificate;
import com.openopportunity.auth.CompanyCertificateRepository;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.BillingTransactionRepository;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingTransactionRepository;
import com.openopportunity.billing.CompanySubscriptionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaService;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobService;
import com.openopportunity.jobalert.JobAlertRepository;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import com.openopportunity.notification.NotificationRepository;
import com.openopportunity.savedjob.SavedJobRepository;
import com.openopportunity.storage.FileStorageService;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin-initiated hard delete for candidate/company accounts — a much bigger blast radius than
 * suspend (see AdminUserService), so it lives in its own service rather than bloating that one
 * with a dozen unrelated repository dependencies. Removes every row that references the account
 * across the app (nothing here has a real DB-level foreign key to users except refresh_tokens,
 * password_reset_tokens, candidate_contact_reveals, and company_certificates — see their ON
 * DELETE CASCADE — so everything else must be cleaned up by hand), and deletes the account's
 * stored files (resume, photo, logo, verification certificates, mock interview recordings)
 * since a cascaded DB row deletion can't reach into FileStorageService on its own. */
@Service
public class AdminAccountDeletionService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateCertificationRepository candidateCertificationRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final CompanyCertificateRepository companyCertificateRepository;
    private final MockInterviewSessionRepository mockInterviewSessionRepository;
    private final ApplicationRepository applicationRepository;
    private final SavedJobRepository savedJobRepository;
    private final JobAlertRepository jobAlertRepository;
    private final NotificationRepository notificationRepository;
    private final IdeaRepository ideaRepository;
    private final IdeaInterestRepository ideaInterestRepository;
    private final IdeaService ideaService;
    private final JobRepository jobRepository;
    private final JobService jobService;
    private final CandidateSubscriptionRepository candidateSubscriptionRepository;
    private final BillingTransactionRepository billingTransactionRepository;
    private final CompanySubscriptionRepository companySubscriptionRepository;
    private final CompanyBillingTransactionRepository companyBillingTransactionRepository;
    private final FileStorageService fileStorageService;

    public AdminAccountDeletionService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            CandidateCertificationRepository candidateCertificationRepository,
            CompanyProfileRepository companyProfileRepository,
            CompanyCertificateRepository companyCertificateRepository,
            MockInterviewSessionRepository mockInterviewSessionRepository,
            ApplicationRepository applicationRepository,
            SavedJobRepository savedJobRepository,
            JobAlertRepository jobAlertRepository,
            NotificationRepository notificationRepository,
            IdeaRepository ideaRepository,
            IdeaInterestRepository ideaInterestRepository,
            IdeaService ideaService,
            JobRepository jobRepository,
            JobService jobService,
            CandidateSubscriptionRepository candidateSubscriptionRepository,
            BillingTransactionRepository billingTransactionRepository,
            CompanySubscriptionRepository companySubscriptionRepository,
            CompanyBillingTransactionRepository companyBillingTransactionRepository,
            FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.candidateCertificationRepository = candidateCertificationRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.companyCertificateRepository = companyCertificateRepository;
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
        this.applicationRepository = applicationRepository;
        this.savedJobRepository = savedJobRepository;
        this.jobAlertRepository = jobAlertRepository;
        this.notificationRepository = notificationRepository;
        this.ideaRepository = ideaRepository;
        this.ideaInterestRepository = ideaInterestRepository;
        this.ideaService = ideaService;
        this.jobRepository = jobRepository;
        this.jobService = jobService;
        this.candidateSubscriptionRepository = candidateSubscriptionRepository;
        this.billingTransactionRepository = billingTransactionRepository;
        this.companySubscriptionRepository = companySubscriptionRepository;
        this.companyBillingTransactionRepository = companyBillingTransactionRepository;
        this.fileStorageService = fileStorageService;
    }

    /** Dispatches to deleteCandidate/deleteCompany by the account's actual role — backs the
     * single DELETE /api/admin/users/{id} endpoint, same "one route, service inspects role"
     * pattern as AdminUserService.suspend/reactivate. Admin-tier accounts (reviewer/admin/
     * super_admin) aren't deletable through this path at all — see AdminTeamService for those. */
    @Transactional
    public void deleteAccount(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new AdminUserNotFoundException(userId));
        if (user.getRole() == UserRole.CANDIDATE) {
            deleteCandidate(userId);
        } else if (user.getRole() == UserRole.COMPANY) {
            deleteCompany(userId);
        } else {
            throw new AdminUserNotFoundException(userId);
        }
    }

    @Transactional
    public void deleteCandidate(UUID candidateId) {
        User user = userRepository
                .findById(candidateId)
                .filter(existing -> existing.getRole() == UserRole.CANDIDATE)
                .orElseThrow(() -> new AdminUserNotFoundException(candidateId));

        candidateProfileRepository.findByUserId(candidateId).ifPresent(profile -> {
            deleteFileQuietly(profile.getResumeStorageKey());
            deleteFileQuietly(profile.getPhotoStorageKey());
        });
        // Work samples and research papers carry no files, so their rows are cleaned up by the
        // DB cascade below with nothing further to do — only certification logos need deleting
        // by hand, same reasoning as company_certificates above deleteCompany.
        for (CandidateCertification certification :
                candidateCertificationRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId)) {
            deleteFileQuietly(certification.getLogoStorageKey());
        }
        mockInterviewSessionRepository.findByCandidateIdOrderByRecordedAtDesc(candidateId).forEach(session -> {
            deleteFileQuietly(session.getVideoStorageKey());
            deleteFileQuietly(session.getThumbnailStorageKey());
        });
        mockInterviewSessionRepository.deleteByCandidateId(candidateId);

        // The jobs this candidate applied to aren't going anywhere — decrement each one's
        // applicant count before the application rows themselves are removed.
        applicationRepository.findByCandidateIdOrderByAppliedAtDesc(candidateId).forEach(application -> {
            jobRepository.findById(application.getJobId()).ifPresent(job -> {
                job.decrementApplicantCount();
                jobRepository.save(job);
            });
        });
        applicationRepository.deleteByCandidateId(candidateId);

        savedJobRepository.deleteByCandidateId(candidateId);
        jobAlertRepository.deleteByCandidateId(candidateId);
        notificationRepository.deleteByRecipientUserId(candidateId);

        // Ideas this candidate submitted (each one's own interests get cleaned up by
        // IdeaService#adminDelete), plus interest they themselves expressed in others' ideas.
        ideaRepository
                .findBySubmitterIdOrderByCreatedAtDesc(candidateId)
                .forEach(idea -> ideaService.adminDelete(idea.getId()));
        ideaInterestRepository.deleteByInterestedUserId(candidateId);

        candidateSubscriptionRepository.findByCandidateId(candidateId).ifPresent(candidateSubscriptionRepository::delete);
        billingTransactionRepository.deleteByCandidateId(candidateId);

        candidateProfileRepository.findByUserId(candidateId).ifPresent(candidateProfileRepository::delete);

        // Cascades refresh_tokens, password_reset_tokens, and candidate_contact_reveals
        // automatically (real DB-level FKs with ON DELETE CASCADE).
        userRepository.delete(user);
    }

    @Transactional
    public void deleteCompany(UUID companyId) {
        User user = userRepository
                .findById(companyId)
                .filter(existing -> existing.getRole() == UserRole.COMPANY)
                .orElseThrow(() -> new AdminUserNotFoundException(companyId));

        companyProfileRepository
                .findByUserId(companyId)
                .ifPresent(profile -> deleteFileQuietly(profile.getLogoStorageKey()));
        for (CompanyCertificate certificate :
                companyCertificateRepository.findByCompanyIdOrderByUploadedAtDesc(companyId)) {
            deleteFileQuietly(certificate.getStorageKey());
        }
        // The company_certificates rows themselves are cleaned up by the DB cascade below —
        // only the physical files needed deleting by hand.

        // Jobs this company posted — JobService#adminDelete also cleans up each job's
        // applications and saved-job bookmarks.
        jobRepository
                .findByCompanyIdOrderByCreatedAtDesc(companyId)
                .forEach(job -> jobService.adminDelete(job.getId()));

        notificationRepository.deleteByRecipientUserId(companyId);

        ideaRepository
                .findBySubmitterIdOrderByCreatedAtDesc(companyId)
                .forEach(idea -> ideaService.adminDelete(idea.getId()));
        ideaInterestRepository.deleteByInterestedUserId(companyId);

        companySubscriptionRepository.findByCompanyId(companyId).ifPresent(companySubscriptionRepository::delete);
        companyBillingTransactionRepository.deleteByCompanyId(companyId);

        companyProfileRepository.findByUserId(companyId).ifPresent(companyProfileRepository::delete);

        // Cascades refresh_tokens, password_reset_tokens, and company_certificates
        // automatically (real DB-level FKs with ON DELETE CASCADE).
        userRepository.delete(user);
    }

    private void deleteFileQuietly(String storageKey) {
        if (storageKey == null) {
            return;
        }
        try {
            fileStorageService.delete(storageKey);
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to delete stored file", ex);
        }
    }
}
