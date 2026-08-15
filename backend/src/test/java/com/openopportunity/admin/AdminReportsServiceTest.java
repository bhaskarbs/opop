package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

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
import com.openopportunity.community.CommunityInterestSubmission;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminReportsServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private MockInterviewSessionRepository mockInterviewSessionRepository;

    @Mock
    private IdeaRepository ideaRepository;

    @Mock
    private IdeaInterestRepository ideaInterestRepository;

    @Mock
    private CommunityInterestSubmissionRepository communityInterestSubmissionRepository;

    @Mock
    private BillingTransactionRepository billingTransactionRepository;

    @Mock
    private CompanyBillingTransactionRepository companyBillingTransactionRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private JobRepository jobRepository;

    private AdminReportsService adminReportsService;

    @BeforeEach
    void setUp() {
        adminReportsService = new AdminReportsService(
                userRepository,
                candidateProfileRepository,
                mockInterviewSessionRepository,
                ideaRepository,
                ideaInterestRepository,
                communityInterestSubmissionRepository,
                billingTransactionRepository,
                companyBillingTransactionRepository,
                companyProfileRepository,
                jobRepository);
    }

    @Test
    void getCandidateStatsCombinesRegisteredResumesAndMockInterviewCountsWhenDaysIsNull() {
        when(userRepository.countByRole(UserRole.CANDIDATE)).thenReturn(120L);
        when(candidateProfileRepository.countByResumeStorageKeyIsNotNull()).thenReturn(95L);
        when(mockInterviewSessionRepository.count()).thenReturn(340L);

        AdminCandidateReportStats stats = adminReportsService.getCandidateStats(null);

        assertThat(stats.totalRegistered()).isEqualTo(120L);
        assertThat(stats.resumesUploaded()).isEqualTo(95L);
        assertThat(stats.mockInterviewsTaken()).isEqualTo(340L);
    }

    @Test
    void getCandidateStatsUsesDateBoundedCountsWhenDaysIsGiven() {
        when(userRepository.countByRoleAndCreatedAtAfter(eq(UserRole.CANDIDATE), any(Instant.class)))
                .thenReturn(12L);
        when(candidateProfileRepository.countByResumeStorageKeyIsNotNullAndResumeUploadedAtAfter(any(Instant.class)))
                .thenReturn(9L);
        when(mockInterviewSessionRepository.countByRecordedAtAfter(any(Instant.class))).thenReturn(34L);

        AdminCandidateReportStats stats = adminReportsService.getCandidateStats(30);

        assertThat(stats.totalRegistered()).isEqualTo(12L);
        assertThat(stats.resumesUploaded()).isEqualTo(9L);
        assertThat(stats.mockInterviewsTaken()).isEqualTo(34L);
    }

    @Test
    void getPartnershipStatsCombinesInterestCountAndFundingSplitOfApprovedIdeasWhenDaysIsNull() {
        when(ideaInterestRepository.count()).thenReturn(3880L);
        when(ideaRepository.countByStatusAndFundingIsNotNull(IdeaStatus.APPROVED)).thenReturn(520L);
        when(ideaRepository.countByStatusAndFundingIsNull(IdeaStatus.APPROVED)).thenReturn(340L);

        AdminPartnershipReportStats stats = adminReportsService.getPartnershipStats(null);

        assertThat(stats.totalPartnershipMatches()).isEqualTo(3880L);
        assertThat(stats.startupsOffering()).isEqualTo(860L);
        assertThat(stats.fundedListings()).isEqualTo(520L);
        assertThat(stats.listingsWithoutFunding()).isEqualTo(340L);
    }

    @Test
    void getPartnershipStatsUsesDateBoundedCountsWhenDaysIsGiven() {
        when(ideaInterestRepository.countByCreatedAtAfter(any(Instant.class))).thenReturn(42L);
        when(ideaRepository.countByStatusAndFundingIsNotNullAndCreatedAtAfter(
                        eq(IdeaStatus.APPROVED), any(Instant.class)))
                .thenReturn(7L);
        when(ideaRepository.countByStatusAndFundingIsNullAndCreatedAtAfter(
                        eq(IdeaStatus.APPROVED), any(Instant.class)))
                .thenReturn(5L);

        AdminPartnershipReportStats stats = adminReportsService.getPartnershipStats(30);

        assertThat(stats.totalPartnershipMatches()).isEqualTo(42L);
        assertThat(stats.startupsOffering()).isEqualTo(12L);
        assertThat(stats.fundedListings()).isEqualTo(7L);
        assertThat(stats.listingsWithoutFunding()).isEqualTo(5L);
    }

    @Test
    void getCommunityInterestSubmissionsMapsEachSubmissionToItsContactDetails() {
        CommunityInterestSubmission submission =
                new CommunityInterestSubmission("Asha Rao", "Acme Co", "asha@example.com", "9876543210");
        when(communityInterestSubmissionRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(submission));

        List<AdminCommunityInterestSummary> summaries = adminReportsService.getCommunityInterestSubmissions();

        assertThat(summaries).containsExactly(new AdminCommunityInterestSummary(
                submission.getId(),
                "Asha Rao",
                "Acme Co",
                "asha@example.com",
                "9876543210",
                submission.getCreatedAt()));
    }

    @Test
    void getFinancialStatsSumsPaidCandidateAndCompanyRevenue() {
        when(billingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID)).thenReturn(23_400L);
        when(companyBillingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID))
                .thenReturn(48_600L);

        AdminFinancialReportStats stats = adminReportsService.getFinancialStats();

        assertThat(stats.totalRevenueRupees()).isEqualTo(72_000L);
        assertThat(stats.candidateSubscriptionRevenueRupees()).isEqualTo(23_400L);
        assertThat(stats.companySubscriptionRevenueRupees()).isEqualTo(48_600L);
    }

    private Job activeJob(UUID companyId, int applicants) {
        Job job = new Job(
                companyId,
                "Some Co",
                "Some Role",
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
        for (int i = 0; i < applicants; i++) {
            job.incrementApplicantCount();
        }
        return job;
    }

    @Test
    void getEmployerStatsGroupsOpenJobsAndApplicationsBySector() {
        UUID techCompanyId = UUID.randomUUID();
        UUID fintechCompanyId = UUID.randomUUID();
        CompanyProfile techProfile = new CompanyProfile(
                techCompanyId, "Private Limited", "CIN1", "GSTIN1", "PAN1", "Tech", "Address", "Signatory",
                "9876543210", null);
        CompanyProfile fintechProfile = new CompanyProfile(
                fintechCompanyId, "Private Limited", "CIN2", "GSTIN2", "PAN2", "Fintech", "Address", "Signatory",
                "9876543211", null);

        Job techJob1 = activeJob(techCompanyId, 3);
        Job techJob2 = activeJob(techCompanyId, 1);
        Job fintechJob = activeJob(fintechCompanyId, 5);

        when(userRepository.countByRole(UserRole.COMPANY)).thenReturn(2L);
        when(companyProfileRepository.countByVerificationStatus(VerificationStatus.VERIFIED)).thenReturn(2L);
        when(jobRepository.countByStatus(JobStatus.ACTIVE)).thenReturn(3L);
        when(jobRepository.findByStatus(JobStatus.ACTIVE)).thenReturn(List.of(techJob1, techJob2, fintechJob));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of(techProfile, fintechProfile));

        AdminEmployerReportStats stats = adminReportsService.getEmployerStats(null);

        assertThat(stats.registeredCompanies()).isEqualTo(2L);
        assertThat(stats.verifiedCompanies()).isEqualTo(2L);
        assertThat(stats.liveJobPostings()).isEqualTo(3L);
        assertThat(stats.topHiringSectors()).containsExactly(
                new SectorHiringStats("Tech", 2, 4), new SectorHiringStats("Fintech", 1, 5));
    }

    @Test
    void getEmployerStatsGroupsBlankOrMissingIndustryAsUnspecifiedInsteadOfThrowing() {
        UUID orphanedCompanyId = UUID.randomUUID();
        // Mirrors a real profile that was wiped after being orphaned and re-provisioned blank
        // (see AuthService.loginWithGoogleAsCompany) — industry is null, not just missing.
        CompanyProfile blankProfile = new CompanyProfile(
                orphanedCompanyId, null, null, null, null, null, null, null, null, null);
        Job orphanedJob = activeJob(orphanedCompanyId, 2);

        when(userRepository.countByRole(UserRole.COMPANY)).thenReturn(1L);
        when(companyProfileRepository.countByVerificationStatus(VerificationStatus.VERIFIED)).thenReturn(0L);
        when(jobRepository.countByStatus(JobStatus.ACTIVE)).thenReturn(1L);
        when(jobRepository.findByStatus(JobStatus.ACTIVE)).thenReturn(List.of(orphanedJob));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of(blankProfile));

        AdminEmployerReportStats stats = adminReportsService.getEmployerStats(null);

        assertThat(stats.topHiringSectors()).containsExactly(new SectorHiringStats("Unspecified", 1, 2));
    }

    @Test
    void getEmployerStatsUsesDateBoundedCountsAndSectorsWhenDaysIsGiven() {
        UUID techCompanyId = UUID.randomUUID();
        CompanyProfile techProfile = new CompanyProfile(
                techCompanyId, "Private Limited", "CIN1", "GSTIN1", "PAN1", "Tech", "Address", "Signatory",
                "9876543210", null);
        Job techJob = activeJob(techCompanyId, 4);

        when(companyProfileRepository.countByCreatedAtAfter(any(Instant.class))).thenReturn(5L);
        when(companyProfileRepository.countByVerificationStatusAndCreatedAtAfter(
                        eq(VerificationStatus.VERIFIED), any(Instant.class)))
                .thenReturn(3L);
        when(jobRepository.countByStatusAndCreatedAtAfter(eq(JobStatus.ACTIVE), any(Instant.class)))
                .thenReturn(1L);
        when(jobRepository.findByStatusAndCreatedAtAfter(eq(JobStatus.ACTIVE), any(Instant.class)))
                .thenReturn(List.of(techJob));
        when(companyProfileRepository.findByUserIdIn(any())).thenReturn(List.of(techProfile));

        AdminEmployerReportStats stats = adminReportsService.getEmployerStats(30);

        assertThat(stats.registeredCompanies()).isEqualTo(5L);
        assertThat(stats.verifiedCompanies()).isEqualTo(3L);
        assertThat(stats.liveJobPostings()).isEqualTo(1L);
        assertThat(stats.topHiringSectors()).containsExactly(new SectorHiringStats("Tech", 1, 4));
    }
}
