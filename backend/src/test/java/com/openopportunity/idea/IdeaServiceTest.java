package com.openopportunity.idea;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaRequest;
import com.openopportunity.idea.exception.IdeaAccessDeniedException;
import com.openopportunity.idea.exception.IdeaNotFoundException;
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

    private IdeaService ideaService;

    @BeforeEach
    void setUp() {
        ideaService = new IdeaService(ideaRepository, userRepository);
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

    @Test
    void getMineRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Idea idea = new Idea(
                ownerId,
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
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        assertThatThrownBy(() -> ideaService.getMine(idea.getId(), otherId))
                .isInstanceOf(IdeaAccessDeniedException.class);
    }

    @Test
    void getMineRejectsUnknownIdea() {
        when(ideaRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> ideaService.getMine(UUID.randomUUID(), UUID.randomUUID()))
                .isInstanceOf(IdeaNotFoundException.class);
    }

    @Test
    void updateRejectsNonOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        Idea idea = new Idea(
                ownerId,
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
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        assertThatThrownBy(() -> ideaService.update(idea.getId(), otherId, sampleRequest()))
                .isInstanceOf(IdeaAccessDeniedException.class);
    }

    @Test
    void updateResetsApprovedIdeaBackToPending() {
        UUID ownerId = UUID.randomUUID();
        Idea idea = new Idea(
                ownerId,
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
        when(ideaRepository.findById(idea.getId())).thenReturn(Optional.of(idea));

        IdeaDetail detail = ideaService.update(idea.getId(), ownerId, sampleRequest());

        assertThat(detail.status()).isEqualTo(IdeaStatus.PENDING);
        assertThat(detail.title()).isEqualTo(sampleRequest().title());
    }
}
