package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import com.openopportunity.admin.dto.AdminCommunityInterestSummary;
import com.openopportunity.admin.dto.AdminPartnershipReportStats;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.community.CommunityInterestSubmission;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.util.List;
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

    private AdminReportsService adminReportsService;

    @BeforeEach
    void setUp() {
        adminReportsService = new AdminReportsService(
                userRepository,
                candidateProfileRepository,
                mockInterviewSessionRepository,
                ideaRepository,
                ideaInterestRepository,
                communityInterestSubmissionRepository);
    }

    @Test
    void getCandidateStatsCombinesRegisteredResumesAndMockInterviewCounts() {
        when(userRepository.countByRole(UserRole.CANDIDATE)).thenReturn(120L);
        when(candidateProfileRepository.countByResumeStorageKeyIsNotNull()).thenReturn(95L);
        when(mockInterviewSessionRepository.count()).thenReturn(340L);

        AdminCandidateReportStats stats = adminReportsService.getCandidateStats();

        assertThat(stats.totalRegistered()).isEqualTo(120L);
        assertThat(stats.resumesUploaded()).isEqualTo(95L);
        assertThat(stats.mockInterviewsTaken()).isEqualTo(340L);
    }

    @Test
    void getPartnershipStatsCombinesInterestCountAndFundingSplitOfApprovedIdeas() {
        when(ideaInterestRepository.count()).thenReturn(3880L);
        when(ideaRepository.countByStatusAndFundingIsNotNull(IdeaStatus.APPROVED)).thenReturn(520L);
        when(ideaRepository.countByStatusAndFundingIsNull(IdeaStatus.APPROVED)).thenReturn(340L);

        AdminPartnershipReportStats stats = adminReportsService.getPartnershipStats();

        assertThat(stats.totalPartnershipMatches()).isEqualTo(3880L);
        assertThat(stats.startupsOffering()).isEqualTo(860L);
        assertThat(stats.fundedListings()).isEqualTo(520L);
        assertThat(stats.listingsWithoutFunding()).isEqualTo(340L);
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
}
