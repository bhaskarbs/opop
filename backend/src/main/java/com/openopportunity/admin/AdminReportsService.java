package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import com.openopportunity.admin.dto.AdminCommunityInterestSummary;
import com.openopportunity.admin.dto.AdminEmployerReportStats;
import com.openopportunity.admin.dto.AdminFinancialReportStats;
import com.openopportunity.admin.dto.AdminPartnershipReportStats;
import com.openopportunity.admin.dto.SectorHiringStats;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyProfile;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.auth.VerificationStatus;
import com.openopportunity.billing.BillingTransactionRepository;
import com.openopportunity.billing.CompanyBillingTransactionRepository;
import com.openopportunity.billing.TransactionStatus;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminReportsService {

    // A job's posting company can end up with a blank industry despite having an ACTIVE job —
    // e.g. a profile that was wiped after being orphaned and re-provisioned blank (see
    // AuthService.loginWithGoogleAsCompany) — so this can't just assume every ACTIVE job's
    // company has a real industry to group by.
    private static final String UNSPECIFIED_SECTOR = "Unspecified";

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final MockInterviewSessionRepository mockInterviewSessionRepository;
    private final IdeaRepository ideaRepository;
    private final IdeaInterestRepository ideaInterestRepository;
    private final CommunityInterestSubmissionRepository communityInterestSubmissionRepository;
    private final BillingTransactionRepository billingTransactionRepository;
    private final CompanyBillingTransactionRepository companyBillingTransactionRepository;
    private final CompanyProfileRepository companyProfileRepository;
    private final JobRepository jobRepository;

    public AdminReportsService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            MockInterviewSessionRepository mockInterviewSessionRepository,
            IdeaRepository ideaRepository,
            IdeaInterestRepository ideaInterestRepository,
            CommunityInterestSubmissionRepository communityInterestSubmissionRepository,
            BillingTransactionRepository billingTransactionRepository,
            CompanyBillingTransactionRepository companyBillingTransactionRepository,
            CompanyProfileRepository companyProfileRepository,
            JobRepository jobRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
        this.ideaRepository = ideaRepository;
        this.ideaInterestRepository = ideaInterestRepository;
        this.communityInterestSubmissionRepository = communityInterestSubmissionRepository;
        this.billingTransactionRepository = billingTransactionRepository;
        this.companyBillingTransactionRepository = companyBillingTransactionRepository;
        this.companyProfileRepository = companyProfileRepository;
        this.jobRepository = jobRepository;
    }

    @Transactional(readOnly = true)
    public AdminCandidateReportStats getCandidateStats() {
        return new AdminCandidateReportStats(
                userRepository.countByRole(UserRole.CANDIDATE),
                candidateProfileRepository.countByResumeStorageKeyIsNotNull(),
                mockInterviewSessionRepository.count());
    }

    /** "Seminars held" and "Avg. partnership duration" are deliberately not here — there's no
     * seminar/event entity, and Idea.timeline is free text (not a structured duration), so
     * neither can be computed from real data. */
    @Transactional(readOnly = true)
    public AdminPartnershipReportStats getPartnershipStats() {
        long fundedListings = ideaRepository.countByStatusAndFundingIsNotNull(IdeaStatus.APPROVED);
        long listingsWithoutFunding = ideaRepository.countByStatusAndFundingIsNull(IdeaStatus.APPROVED);
        return new AdminPartnershipReportStats(
                ideaInterestRepository.count(),
                fundedListings + listingsWithoutFunding,
                fundedListings,
                listingsWithoutFunding);
    }

    @Transactional(readOnly = true)
    public List<AdminCommunityInterestSummary> getCommunityInterestSubmissions() {
        return communityInterestSubmissionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(submission -> new AdminCommunityInterestSummary(
                        submission.getId(),
                        submission.getName(),
                        submission.getCompanyName(),
                        submission.getEmail(),
                        submission.getPhone(),
                        submission.getCreatedAt()))
                .toList();
    }

    /** "Job posting fees" and "Featured listings" are deliberately not here — there's no
     * payment gate on job postings or featured listings anywhere in the schema, so those
     * aren't real revenue sources. */
    @Transactional(readOnly = true)
    public AdminFinancialReportStats getFinancialStats() {
        long candidateRevenue = billingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID);
        long companyRevenue =
                companyBillingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID);
        return new AdminFinancialReportStats(
                candidateRevenue + companyRevenue, candidateRevenue, companyRevenue);
    }

    /** "Avg. time to fill" and a fill-rate column are deliberately not here — JobStatus has no
     * FILLED state (only DRAFT/PENDING_APPROVAL/ACTIVE/REJECTED/CLOSED), so there's no way to
     * tell a CLOSED job was actually filled rather than cancelled or expired. */
    @Transactional(readOnly = true)
    public AdminEmployerReportStats getEmployerStats() {
        return new AdminEmployerReportStats(
                userRepository.countByRole(UserRole.COMPANY),
                companyProfileRepository.countByVerificationStatus(VerificationStatus.VERIFIED),
                jobRepository.countByStatus(JobStatus.ACTIVE),
                topHiringSectors());
    }

    private List<SectorHiringStats> topHiringSectors() {
        List<Job> activeJobs = jobRepository.findByStatus(JobStatus.ACTIVE);
        List<UUID> companyIds = activeJobs.stream().map(Job::getCompanyId).distinct().toList();
        Map<UUID, CompanyProfile> profilesByCompanyId = companyProfileRepository.findByUserIdIn(companyIds).stream()
                .collect(Collectors.toMap(CompanyProfile::getUserId, profile -> profile));

        Map<String, List<Job>> jobsBySector = activeJobs.stream()
                .collect(Collectors.groupingBy(job -> sectorFor(profilesByCompanyId.get(job.getCompanyId()))));

        return jobsBySector.entrySet().stream()
                .map(entry -> new SectorHiringStats(
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().stream().mapToInt(Job::getApplicantCount).sum()))
                .sorted(Comparator.comparingLong(SectorHiringStats::openJobs).reversed())
                .toList();
    }

    private static String sectorFor(CompanyProfile profile) {
        String industry = profile == null ? null : profile.getIndustry();
        return industry == null || industry.isBlank() ? UNSPECIFIED_SECTOR : industry;
    }
}
