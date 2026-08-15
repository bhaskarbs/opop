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
import com.openopportunity.community.CommunityInterestSubmission;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.cache.annotation.Cacheable;
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

    /** days == null means all-time (the original, unfiltered behavior) — the reports page's
     * date-range dropdown always sends a value in practice, but this stays callable without one
     * so "all time" doesn't need a magic sentinel like Integer.MAX_VALUE. Keyed by days so each
     * distinct range gets its own 60s-TTL cache entry rather than colliding on one. */
    // Spring's default key generation rejects a literal null key outright ("Null key returned
    // for cache operation") — the ternary keeps "all time" (days == null) as its own valid,
    // stable cache entry instead of a magic sentinel int.
    @Cacheable(value = "adminCandidateStats", key = "#days == null ? 'all' : #days")
    @Transactional(readOnly = true)
    public AdminCandidateReportStats getCandidateStats(Integer days) {
        if (days == null) {
            return new AdminCandidateReportStats(
                    userRepository.countByRole(UserRole.CANDIDATE),
                    candidateProfileRepository.countByResumeStorageKeyIsNotNull(),
                    mockInterviewSessionRepository.count());
        }
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        return new AdminCandidateReportStats(
                userRepository.countByRoleAndCreatedAtAfter(UserRole.CANDIDATE, since),
                candidateProfileRepository.countByResumeStorageKeyIsNotNullAndResumeUploadedAtAfter(since),
                mockInterviewSessionRepository.countByRecordedAtAfter(since));
    }

    /** "Seminars held" and "Avg. partnership duration" are deliberately not here — there's no
     * seminar/event entity, and Idea.timeline is free text (not a structured duration), so
     * neither can be computed from real data.
     *
     * <p>days == null means all-time, same convention as getCandidateStats. When a range is
     * given: totalPartnershipMatches is bounded by IdeaInterest.createdAt (interest expressed in
     * this window), and fundedListings/listingsWithoutFunding/startupsOffering are bounded by
     * Idea.createdAt (listings submitted in this window that are currently APPROVED — not a
     * snapshot of every APPROVED listing regardless of age). */
    @Cacheable(value = "adminPartnershipStats", key = "#days == null ? 'all' : #days")
    @Transactional(readOnly = true)
    public AdminPartnershipReportStats getPartnershipStats(Integer days) {
        if (days == null) {
            long fundedListings = ideaRepository.countByStatusAndFundingIsNotNull(IdeaStatus.APPROVED);
            long listingsWithoutFunding = ideaRepository.countByStatusAndFundingIsNull(IdeaStatus.APPROVED);
            return new AdminPartnershipReportStats(
                    ideaInterestRepository.count(),
                    fundedListings + listingsWithoutFunding,
                    fundedListings,
                    listingsWithoutFunding);
        }
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        long fundedListings =
                ideaRepository.countByStatusAndFundingIsNotNullAndCreatedAtAfter(IdeaStatus.APPROVED, since);
        long listingsWithoutFunding =
                ideaRepository.countByStatusAndFundingIsNullAndCreatedAtAfter(IdeaStatus.APPROVED, since);
        return new AdminPartnershipReportStats(
                ideaInterestRepository.countByCreatedAtAfter(since),
                fundedListings + listingsWithoutFunding,
                fundedListings,
                listingsWithoutFunding);
    }

    // days == null means all-time, same convention as getCandidateStats — bounded by
    // CommunityInterestSubmission.createdAt (submissions made within the window) when given.
    @Cacheable(value = "adminCommunityInterestSubmissions", key = "#days == null ? 'all' : #days")
    @Transactional(readOnly = true)
    public List<AdminCommunityInterestSummary> getCommunityInterestSubmissions(Integer days) {
        List<CommunityInterestSubmission> submissions = days == null
                ? communityInterestSubmissionRepository.findAllByOrderByCreatedAtDesc()
                : communityInterestSubmissionRepository.findAllByCreatedAtAfterOrderByCreatedAtDesc(
                        Instant.now().minus(days, ChronoUnit.DAYS));
        return submissions.stream()
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
     * aren't real revenue sources.
     *
     * <p>days == null means all-time, same convention as getCandidateStats — bounded by each
     * transaction's createdAt (when it was recorded PAID) when given, i.e. revenue collected in
     * this window rather than the running total. */
    @Cacheable(value = "adminFinancialStats", key = "#days == null ? 'all' : #days")
    @Transactional(readOnly = true)
    public AdminFinancialReportStats getFinancialStats(Integer days) {
        long candidateRevenue;
        long companyRevenue;
        if (days == null) {
            candidateRevenue = billingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID);
            companyRevenue = companyBillingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID);
        } else {
            Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
            candidateRevenue = billingTransactionRepository.sumAmountRupeesByStatusAndCreatedAtAfter(
                    TransactionStatus.PAID, since);
            companyRevenue = companyBillingTransactionRepository.sumAmountRupeesByStatusAndCreatedAtAfter(
                    TransactionStatus.PAID, since);
        }
        return new AdminFinancialReportStats(
                candidateRevenue + companyRevenue, candidateRevenue, companyRevenue);
    }

    /** "Avg. time to fill" and a fill-rate column are deliberately not here — JobStatus has no
     * FILLED state (only DRAFT/PENDING_APPROVAL/ACTIVE/REJECTED/CLOSED), so there's no way to
     * tell a CLOSED job was actually filled rather than cancelled or expired.
     *
     * <p>days == null means all-time, same convention as getCandidateStats. When a range is
     * given: registeredCompanies/verifiedCompanies are both bounded by CompanyProfile.createdAt
     * — deliberately not User.createdAt, since a re-provisioned profile (see
     * AuthService#loginWithGoogleAsCompany) gets a fresh CompanyProfile.createdAt independent of
     * the original registration date, and mixing the two bases let verifiedCompanies read higher
     * than registeredCompanies for the same window, which makes no sense to an admin reading the
     * report. VerificationStatus has no separate "verified at" timestamp, so "verified companies
     * in this window" reads as "of the companies whose profile dates into this window, how many
     * are (now) verified" rather than "verified during this window". liveJobPostings/
     * topHiringSectors are bounded by Job.createdAt (jobs that went live in this window and are
     * still ACTIVE now, not a snapshot of every ACTIVE job regardless of age). */
    @Cacheable(value = "adminEmployerStats", key = "#days == null ? 'all' : #days")
    @Transactional(readOnly = true)
    public AdminEmployerReportStats getEmployerStats(Integer days) {
        if (days == null) {
            return new AdminEmployerReportStats(
                    userRepository.countByRole(UserRole.COMPANY),
                    companyProfileRepository.countByVerificationStatus(VerificationStatus.VERIFIED),
                    jobRepository.countByStatus(JobStatus.ACTIVE),
                    topHiringSectors(jobRepository.findByStatus(JobStatus.ACTIVE)));
        }
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        return new AdminEmployerReportStats(
                companyProfileRepository.countByCreatedAtAfter(since),
                companyProfileRepository.countByVerificationStatusAndCreatedAtAfter(
                        VerificationStatus.VERIFIED, since),
                jobRepository.countByStatusAndCreatedAtAfter(JobStatus.ACTIVE, since),
                topHiringSectors(jobRepository.findByStatusAndCreatedAtAfter(JobStatus.ACTIVE, since)));
    }

    private List<SectorHiringStats> topHiringSectors(List<Job> activeJobs) {
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
