package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.CandidateSearchSummary;
import com.openopportunity.billing.CandidateSubscription;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingService;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.storage.FileStorageService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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

    @Test
    void featuredCandidatesOutrankPlusPlanCandidatesWhichOutrankEveryoneElse() {
        CandidateSearchService service = new CandidateSearchService(
                userRepository,
                candidateProfileRepository,
                companyProfileRepository,
                candidateContactRevealRepository,
                candidateSubscriptionRepository,
                fileStorageService,
                companyBillingService);

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
}
