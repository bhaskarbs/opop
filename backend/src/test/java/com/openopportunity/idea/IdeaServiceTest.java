package com.openopportunity.idea;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.CandidateProfile;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.CandidateBillingService;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaInterestRequest;
import com.openopportunity.idea.dto.IdeaInterestSummary;
import com.openopportunity.idea.dto.IdeaRequest;
import com.openopportunity.idea.exception.DuplicateIdeaInterestException;
import com.openopportunity.idea.exception.IdeaAccessDeniedException;
import com.openopportunity.idea.exception.IdeaNotFoundException;
import com.openopportunity.notification.NotificationService;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IdeaServiceTest {

    @Mock
    private IdeaRepository ideaRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IdeaInterestRepository ideaInterestRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private CandidateBillingService candidateBillingService;

    private IdeaService ideaService;

    @BeforeEach
    void setUp() {
        ideaService = new IdeaService(
                ideaRepository,
                userRepository,
                ideaInterestRepository,
                notificationService,
                candidateProfileRepository,
                candidateBillingService);
    }

    private IdeaRequest sampleRequest() {
        return new IdeaRequest(
                "Instant micro-insurance for gig workers",
                "Fintech",
                IdeaStage.CONCEPT,
                "Gig workers have no income protection.",
                "Pay-per-day micro-insurance deducted from payouts.",
                "Gig workers in tier-1 cities.",
                "₹35,00,000",
                "8% equity",
                4,
                "9 months to launch",
                null,
                "founder@vertex.com");
    }

    @Test
    void createLooksUpSubmitterNameAndStartsAsPending() {
        UUID submitterId = UUID.randomUUID();
        User submitter = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        when(userRepository.findById(submitterId)).thenReturn(Optional.of(submitter));
        when(ideaRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        IdeaDetail detail = ideaService.create(submitterId, sampleRequest());

        assertThat(detail.submitterName()).isEqualTo("Vertex Robotics");
        assertThat(detail.status()).isEqualTo(IdeaStatus.PENDING);
    }

    private Idea sampleIdea(UUID submitterId) {
        return new Idea(
                submitterId,
                "Vertex Robotics",
                UserRole.COMPANY,
                "Title",
                "Fintech",
                IdeaStage.CONCEPT,
                "Problem",
                "Solution",
                "Target market",
                null,
                null,
                null,
                null,
                null,
                "founder@vertex.com");
    }

    @Test
    void getRejectsUnknownIdea() {
        when(ideaRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ideaService.get(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(IdeaNotFoundException.class);
    }

    @Test
    void getHidesPendingIdeaFromNonOwner() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        assertThatThrownBy(() -> ideaService.get(idea.getId(), UUID.randomUUID()))
                .isInstanceOf(IdeaNotFoundException.class);
        assertThatThrownBy(() -> ideaService.get(idea.getId(), null)).isInstanceOf(IdeaNotFoundException.class);
    }

    @Test
    void getAllowsOwnerToViewTheirOwnPendingIdea() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        IdeaDetail detail = ideaService.get(idea.getId(), ownerId);

        assertThat(detail.status()).isEqualTo(IdeaStatus.PENDING);
    }

    @Test
    void getAllowsAnyoneToViewAnApprovedIdea() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        idea.approve();
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        IdeaDetail detail = ideaService.get(idea.getId(), null);

        assertThat(detail.status()).isEqualTo(IdeaStatus.APPROVED);
    }

    @Test
    void updateRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        assertThatThrownBy(() -> ideaService.update(idea.getId(), otherId, sampleRequest()))
                .isInstanceOf(IdeaAccessDeniedException.class);
    }

    @Test
    void updateResetsApprovedIdeaBackToPending() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        idea.approve();
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        IdeaDetail detail = ideaService.update(idea.getId(), ownerId, sampleRequest());

        assertThat(detail.status()).isEqualTo(IdeaStatus.PENDING);
        assertThat(detail.title()).isEqualTo(sampleRequest().title());
    }

    @Test
    void approveRejectsUnknownIdea() {
        when(ideaRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ideaService.approve(UUID.randomUUID()))
                .isInstanceOf(IdeaNotFoundException.class);
    }

    @Test
    void approveMakesIdeaVisibleToNonOwner() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        IdeaDetail approved = ideaService.approve(idea.getId());

        assertThat(approved.status()).isEqualTo(IdeaStatus.APPROVED);
        assertThat(ideaService.get(idea.getId(), null).status()).isEqualTo(IdeaStatus.APPROVED);
    }

    @Test
    void rejectSetsStatusToRejected() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        IdeaDetail rejected = ideaService.reject(idea.getId());

        assertThat(rejected.status()).isEqualTo(IdeaStatus.REJECTED);
    }

    @Test
    void getMineReturnsOnlyTheCallersOwnIdeasRegardlessOfStatus() {
        UUID ownerId = UUID.randomUUID();
        Idea pending = sampleIdea(ownerId);
        Idea approved = sampleIdea(ownerId);
        approved.approve();
        when(ideaRepository.findBySubmitterIdOrderByCreatedAtDesc(ownerId))
                .thenReturn(java.util.List.of(pending, approved));

        var mine = ideaService.getMine(ownerId);

        assertThat(mine).hasSize(2);
        assertThat(mine).extracting("status").containsExactlyInAnyOrder(IdeaStatus.PENDING, IdeaStatus.APPROVED);
    }

    @Test
    void deleteRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        assertThatThrownBy(() -> ideaService.delete(idea.getId(), otherId))
                .isInstanceOf(IdeaAccessDeniedException.class);
    }

    @Test
    void deleteRemovesTheOwnersIdea() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        ideaService.delete(idea.getId(), ownerId);

        org.mockito.Mockito.verify(ideaRepository).delete(idea);
    }

    @Test
    void submitInterestIncrementsCountAndRejectsASecondAttemptFromTheSameUser() {
        UUID ownerId = UUID.randomUUID();
        UUID interestedUserId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        idea.approve();
        User interestedUser = new User("investor@example.com", "hash", "Fatima Sheikh", UserRole.CANDIDATE);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));
        when(userRepository.findById(interestedUserId)).thenReturn(Optional.of(interestedUser));
        when(ideaInterestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        IdeaInterestRequest request = new IdeaInterestRequest(IdeaInterestRole.INVESTOR, "₹5,00,000", "Interested.");
        IdeaInterestSummary summary = ideaService.submitInterest(idea.getId(), interestedUserId, request);

        assertThat(summary.interestedUserName()).isEqualTo("Fatima Sheikh");
        assertThat(idea.getInterestedCount()).isEqualTo(1);

        when(ideaInterestRepository.existsByIdeaIdAndInterestedUserId(idea.getId(), interestedUserId))
                .thenReturn(true);

        assertThatThrownBy(() -> ideaService.submitInterest(idea.getId(), interestedUserId, request))
                .isInstanceOf(DuplicateIdeaInterestException.class);
    }

    @Test
    void getInterestsRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        assertThatThrownBy(() -> ideaService.getInterests(idea.getId(), otherId))
                .isInstanceOf(IdeaAccessDeniedException.class);
    }

    @Test
    void getInterestsOnlyIncludesContactNumberWhenCallerIsOnAPaidPlan() {
        UUID ownerId = UUID.randomUUID();
        UUID interestedUserId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        IdeaInterest interest = new IdeaInterest(
                idea.getId(),
                idea.getTitle(),
                idea.getSubmitterName(),
                interestedUserId,
                "Fatima Sheikh",
                IdeaInterestRole.INVESTOR,
                "₹5,00,000",
                "Interested.");
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));
        when(ideaInterestRepository.findByIdeaIdOrderByCreatedAtDesc(idea.getId()))
                .thenReturn(java.util.List.of(interest));
        CandidateProfile interestedProfile =
                new CandidateProfile(interestedUserId, "9876543210", java.util.List.of(), null);
        when(candidateProfileRepository.findByUserId(interestedUserId)).thenReturn(Optional.of(interestedProfile));

        when(candidateBillingService.getCurrentPlan(ownerId)).thenReturn(SubscriptionPlan.FREE);
        assertThat(ideaService.getInterests(idea.getId(), ownerId).get(0).contactNumber()).isNull();

        when(candidateBillingService.getCurrentPlan(ownerId)).thenReturn(SubscriptionPlan.PLUS);
        assertThat(ideaService.getInterests(idea.getId(), ownerId).get(0).contactNumber())
                .isEqualTo("9876543210");
    }

    @Test
    void getMyInterestsReturnsTheDenormalizedIdeaTitleAndSubmitter() {
        UUID ownerId = UUID.randomUUID();
        UUID interestedUserId = UUID.randomUUID();
        Idea idea = sampleIdea(ownerId);
        com.openopportunity.idea.IdeaInterest interest = new com.openopportunity.idea.IdeaInterest(
                idea.getId(),
                idea.getTitle(),
                idea.getSubmitterName(),
                interestedUserId,
                "Fatima Sheikh",
                IdeaInterestRole.INVESTOR,
                "₹5,00,000",
                "Interested.");
        when(ideaInterestRepository.findByInterestedUserIdOrderByCreatedAtDesc(interestedUserId))
                .thenReturn(java.util.List.of(interest));

        var mine = ideaService.getMyInterests(interestedUserId);

        assertThat(mine).hasSize(1);
        assertThat(mine.get(0).ideaTitle()).isEqualTo(idea.getTitle());
        assertThat(mine.get(0).ideaSubmitterName()).isEqualTo(idea.getSubmitterName());
    }
}
