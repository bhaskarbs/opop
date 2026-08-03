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
import com.openopportunity.billing.CandidateSubscription;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingService;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.mockinterview.MockInterviewService;
import com.openopportunity.mockinterview.dto.MockInterviewSessionSummary;
import com.openopportunity.storage.FileStorageService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
                mockInterviewService);

        User plainUser = new User("plain@example.com", "hash", "Plain Candidate", UserRole.CANDIDATE);
        User plusUser = new User("plus@example.com", "hash", "Plus Candidate", UserRole.CANDIDATE);
        User featuredUser = new User("featured@example.com", "hash", "Featured Candidate", UserRole.CANDIDATE);

        CandidateProfile plainProfile = new CandidateProfile(plainUser.getId(), "9000000000", List.of(), null);
        CandidateProfile plusProfile = new CandidateProfile(plusUser.getId(), "9000000001", List.of(), null);
        CandidateProfile featuredProfile =
                new CandidateProfile(featuredUser.getId(), "9000000002", List.of(), null);
        featuredProfile.feature();

        when(candidateProfileRepository.findAll())
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

    private CandidateSearchService service() {
        return new CandidateSearchService(
                userRepository,
                candidateProfileRepository,
                companyProfileRepository,
                candidateContactRevealRepository,
                candidateSubscriptionRepository,
                fileStorageService,
                companyBillingService,
                mockInterviewService);
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
                UUID.randomUUID(), 5, 300, true, Instant.now(), true);
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
}
