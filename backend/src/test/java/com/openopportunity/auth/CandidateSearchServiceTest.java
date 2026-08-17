package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.CandidateProfileForCompany;
import com.openopportunity.auth.dto.CandidateSearchSummary;
import com.openopportunity.auth.exception.CompanyNotEligibleToContactCandidatesException;
import com.openopportunity.auth.exception.ResumeRenderingFailedException;
import com.openopportunity.billing.CandidateSubscription;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingService;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.mockinterview.MockInterviewService;
import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import com.openopportunity.storage.FileStorageService;
import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.jpa.domain.Specification;

/** Covers the ranking layered on top of a company's chosen sort (see
 * CandidateSearchService#resolveSort) — an admin-featured candidate leads, then a Plus-plan
 * candidate, with everything else falling back to whatever sort was requested. */
@ExtendWith(MockitoExtension.class)
class CandidateSearchServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private CandidateContactRevealRepository candidateContactRevealRepository;

    @Mock
    private CandidateSubscriptionRepository candidateSubscriptionRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private CompanyBillingService companyBillingService;

    @Mock
    private MockInterviewService mockInterviewService;

    @Test
    void featuredCandidatesOutrankPlusPlanCandidatesWhichOutrankEveryoneElse() {
        CandidateSearchService service = new CandidateSearchService(
                userRepository,
                candidateProfileRepository,
                companyProfileRepository,
                candidateContactRevealRepository,
                candidateSubscriptionRepository,
                fileStorageService,
                companyBillingService,
                mockInterviewService,
                Runnable::run,
                10);

        User plainUser = new User("plain@example.com", "hash", "Plain Candidate", UserRole.CANDIDATE);
        User plusUser = new User("plus@example.com", "hash", "Plus Candidate", UserRole.CANDIDATE);
        User featuredUser = new User("featured@example.com", "hash", "Featured Candidate", UserRole.CANDIDATE);

        CandidateProfile plainProfile = new CandidateProfile(plainUser.getId(), "9000000000", List.of(), null);
        CandidateProfile plusProfile = new CandidateProfile(plusUser.getId(), "9000000001", List.of(), null);
        CandidateProfile featuredProfile =
                new CandidateProfile(featuredUser.getId(), "9000000002", List.of(), null);
        featuredProfile.feature();

        when(candidateProfileRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(plainProfile, plusProfile, featuredProfile));
        when(userRepository.findAllById(any())).thenReturn(List.of(plainUser, plusUser, featuredUser));
        UUID companyId = UUID.randomUUID();
        when(candidateContactRevealRepository.findByCompanyId(companyId)).thenReturn(List.of());
        CandidateSubscription plusSubscription = new CandidateSubscription(plusUser.getId(), SubscriptionPlan.PLUS);
        plusSubscription.changePlan(SubscriptionPlan.PLUS, Instant.now().plus(30, ChronoUnit.DAYS));
        when(candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(eq(SubscriptionPlan.FREE), any()))
                .thenReturn(List.of(plusSubscription));

        List<CandidateSearchSummary> results = service.search(companyId, null, null, "relevant");

        assertThat(results)
                .extracting(CandidateSearchSummary::userId)
                .containsExactly(featuredUser.getId(), plusUser.getId(), plainUser.getId());
    }

    @Test
    void searchIncrementsEachReturnedCandidatesSearchAppearanceCount() {
        CandidateSearchService service = service();
        User candidate = new User("candidate@example.com", "hash", "Candidate", UserRole.CANDIDATE);
        CandidateProfile profile = new CandidateProfile(candidate.getId(), "9000000000", List.of(), null);

        when(candidateProfileRepository.findAll(any(Specification.class))).thenReturn(List.of(profile));
        when(userRepository.findAllById(any())).thenReturn(List.of(candidate));
        UUID companyId = UUID.randomUUID();
        when(candidateContactRevealRepository.findByCompanyId(companyId)).thenReturn(List.of());
        when(candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(eq(SubscriptionPlan.FREE), any()))
                .thenReturn(List.of());

        service.search(companyId, null, null, "relevant");
        service.search(companyId, null, null, "relevant");

        assertThat(profile.getSearchAppearanceCount()).isEqualTo(2);
        verify(candidateProfileRepository, org.mockito.Mockito.times(2)).saveAll(List.of(profile));
    }

    @Test
    void getIncrementsTheCandidatesProfileViewCount() {
        CandidateSearchService service = service();
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        CandidateProfile profile = new CandidateProfile(candidateId, "9876543210", List.of(), null);
        User candidate = new User("candidate@example.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleCompanyProfile(companyId)));
        when(companyBillingService.getPlanPeriod(companyId))
                .thenReturn(new CompanyBillingService.PlanPeriod(CompanySubscriptionPlan.GROWTH, null, null));
        when(candidateProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(profile));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        service.get(companyId, candidateId);
        service.get(companyId, candidateId);

        assertThat(profile.getProfileViewCount()).isEqualTo(2);
        verify(candidateProfileRepository, org.mockito.Mockito.times(2)).save(profile);
    }

    @Test
    void recentLoginSortPutsMostRecentlyLoggedInFirstAndNeverLoggedInLast() throws Exception {
        CandidateSearchService service = service();

        User neverLoggedIn = new User("never@example.com", "hash", "Never Logged In", UserRole.CANDIDATE);
        User loggedInEarlier = new User("earlier@example.com", "hash", "Earlier Login", UserRole.CANDIDATE);
        User loggedInRecently = new User("recent@example.com", "hash", "Recent Login", UserRole.CANDIDATE);
        // recordLogin() stamps Instant.now() — sleep between calls so the two timestamps land
        // in different milliseconds; otherwise this assertion is flaky under a fast/warm JVM.
        loggedInEarlier.recordLogin();
        Thread.sleep(5);
        loggedInRecently.recordLogin();

        CandidateProfile neverProfile = new CandidateProfile(neverLoggedIn.getId(), "9000000000", List.of(), null);
        CandidateProfile earlierProfile =
                new CandidateProfile(loggedInEarlier.getId(), "9000000001", List.of(), null);
        CandidateProfile recentProfile =
                new CandidateProfile(loggedInRecently.getId(), "9000000002", List.of(), null);

        when(candidateProfileRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(earlierProfile, neverProfile, recentProfile));
        when(userRepository.findAllById(any()))
                .thenReturn(List.of(neverLoggedIn, loggedInEarlier, loggedInRecently));
        UUID companyId = UUID.randomUUID();
        when(candidateContactRevealRepository.findByCompanyId(companyId)).thenReturn(List.of());
        when(candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(eq(SubscriptionPlan.FREE), any()))
                .thenReturn(List.of());

        List<CandidateSearchSummary> results = service.search(companyId, null, null, "recentLogin");

        assertThat(results)
                .extracting(CandidateSearchSummary::userId)
                .containsExactly(loggedInRecently.getId(), loggedInEarlier.getId(), neverLoggedIn.getId());
    }

    @Test
    void mostActiveSortPutsHighestLoginCountFirstRegardlessOfRecency() throws Exception {
        CandidateSearchService service = service();

        User frequentButStale = new User("frequent@example.com", "hash", "Frequent But Stale", UserRole.CANDIDATE);
        User rareButRecent = new User("rare@example.com", "hash", "Rare But Recent", UserRole.CANDIDATE);
        // Logs in three times (stale — no logins since), so it should still outrank a candidate
        // who's logged in just once, even though that once was more recent.
        frequentButStale.recordLogin();
        frequentButStale.recordLogin();
        frequentButStale.recordLogin();
        Thread.sleep(5);
        rareButRecent.recordLogin();

        CandidateProfile frequentProfile =
                new CandidateProfile(frequentButStale.getId(), "9000000000", List.of(), null);
        CandidateProfile rareProfile = new CandidateProfile(rareButRecent.getId(), "9000000001", List.of(), null);

        when(candidateProfileRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(rareProfile, frequentProfile));
        when(userRepository.findAllById(any())).thenReturn(List.of(frequentButStale, rareButRecent));
        UUID companyId = UUID.randomUUID();
        when(candidateContactRevealRepository.findByCompanyId(companyId)).thenReturn(List.of());
        when(candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(eq(SubscriptionPlan.FREE), any()))
                .thenReturn(List.of());

        List<CandidateSearchSummary> results = service.search(companyId, null, null, "mostActive");

        assertThat(results)
                .extracting(CandidateSearchSummary::userId)
                .containsExactly(frequentButStale.getId(), rareButRecent.getId());
    }

    private CandidateSearchService service() {
        return service(Runnable::run, 10);
    }

    private CandidateSearchService service(Executor resumeRenderExecutor, long resumeRenderTimeoutSeconds) {
        return new CandidateSearchService(
                userRepository,
                candidateProfileRepository,
                companyProfileRepository,
                candidateContactRevealRepository,
                candidateSubscriptionRepository,
                fileStorageService,
                companyBillingService,
                mockInterviewService,
                resumeRenderExecutor,
                resumeRenderTimeoutSeconds);
    }

    private CompanyProfile eligibleCompanyProfile(UUID companyId) {
        CompanyProfile profile = new CompanyProfile(
                companyId, "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory",
                "9876543210", null);
        profile.verify();
        return profile;
    }

    @Test
    void getEmbedsTheCandidatesVisibleMockInterviewSessions() {
        CandidateSearchService service = service();
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        CandidateProfile profile = new CandidateProfile(candidateId, "9876543210", List.of(), null);
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleCompanyProfile(companyId)));
        when(companyBillingService.getPlanPeriod(companyId))
                .thenReturn(new CompanyBillingService.PlanPeriod(CompanySubscriptionPlan.GROWTH, null, null));
        when(candidateProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(profile));
        when(userRepository.findById(candidateId)).thenReturn(Optional.of(candidate));
        MockInterviewSessionSummary session = new MockInterviewSessionSummary(
                UUID.randomUUID(), 5, 300, true, Instant.now(), true, "test-share-token");
        when(mockInterviewService.getVisibleForCompany(candidateId)).thenReturn(List.of(session));

        CandidateProfileForCompany result = service.get(companyId, candidateId);

        assertThat(result.mockInterviewSessions()).containsExactly(session);
    }

    @Test
    void getMockInterviewVideoRejectsAnIneligibleCompany() {
        CandidateSearchService service = service();
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        // Unverified — the same "complete but not yet admin-verified" gate resume access uses.
        CompanyProfile unverified = new CompanyProfile(
                companyId, "Private Limited", "CIN123", "GSTIN123", "PAN123", "Tech", "Address", "Signatory",
                "9876543210", null);
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(unverified));

        assertThatThrownBy(() -> service.getMockInterviewVideo(companyId, candidateId, sessionId))
                .isInstanceOf(CompanyNotEligibleToContactCandidatesException.class);
        verify(mockInterviewService, never()).getVideoForCompany(any(), any());
    }

    @Test
    void getMockInterviewVideoDelegatesWhenTheCompanyIsEligible() throws Exception {
        CandidateSearchService service = service();
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleCompanyProfile(companyId)));
        when(companyBillingService.getPlanPeriod(companyId))
                .thenReturn(new CompanyBillingService.PlanPeriod(CompanySubscriptionPlan.GROWTH, null, null));
        MockInterviewService.LoadedFile loaded =
                new MockInterviewService.LoadedFile(new org.springframework.core.io.ByteArrayResource(new byte[] {1}), "video/webm");
        when(mockInterviewService.getVideoForCompany(sessionId, candidateId)).thenReturn(loaded);

        MockInterviewService.LoadedFile result = service.getMockInterviewVideo(companyId, candidateId, sessionId);

        assertThat(result.contentType()).isEqualTo("video/webm");
    }

    private void stubEligibleForResumeAccess(UUID companyId) {
        when(companyProfileRepository.findByUserId(companyId)).thenReturn(Optional.of(eligibleCompanyProfile(companyId)));
        when(companyBillingService.getPlanPeriod(companyId))
                .thenReturn(new CompanyBillingService.PlanPeriod(CompanySubscriptionPlan.GROWTH, null, null));
    }

    private void stubResume(UUID candidateId, String storageKey, byte[] content) throws Exception {
        CandidateProfile profile = new CandidateProfile(candidateId, "9000000000", List.of(), "resume.pdf");
        profile.updateResume("resume.pdf", storageKey, content.length, Instant.now());
        when(candidateProfileRepository.findByUserId(candidateId)).thenReturn(Optional.of(profile));
        when(fileStorageService.load(storageKey)).thenReturn(new ByteArrayResource(content));
    }

    private static byte[] minimalValidPdf() throws Exception {
        try (PDDocument document = new PDDocument();
                ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            document.save(out);
            return out.toByteArray();
        }
    }

    @Test
    void getResumeHtmlRendersOnTheConfiguredExecutorAndReturnsTheHtml() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        stubEligibleForResumeAccess(companyId);
        stubResume(candidateId, "resumes/x.pdf", minimalValidPdf());
        CandidateSearchService service = service(Runnable::run, 10);

        String html = service.getResumeHtml(companyId, candidateId);

        assertThat(html).isNotNull();
    }

    @Test
    void getResumeHtmlFailsCleanlyInsteadOfHangingWhenRenderingTimesOut() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        stubEligibleForResumeAccess(companyId);
        stubResume(candidateId, "resumes/x.pdf", new byte[] {1, 2, 3});
        // Never actually runs the submitted task — simulates a render that's still going when
        // the timeout elapses, without needing a real pathological file to hang on.
        Executor neverRuns = task -> {};
        CandidateSearchService service = service(neverRuns, 1);

        assertThatThrownBy(() -> service.getResumeHtml(companyId, candidateId))
                .isInstanceOf(ResumeRenderingFailedException.class);
    }

    @Test
    void getResumeHtmlFailsCleanlyWhenTheExecutorIsSaturated() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        stubEligibleForResumeAccess(companyId);
        stubResume(candidateId, "resumes/x.pdf", new byte[] {1, 2, 3});
        Executor saturated = task -> {
            throw new RejectedExecutionException("pool full");
        };
        CandidateSearchService service = service(saturated, 10);

        assertThatThrownBy(() -> service.getResumeHtml(companyId, candidateId))
                .isInstanceOf(ResumeRenderingFailedException.class);
    }
}
