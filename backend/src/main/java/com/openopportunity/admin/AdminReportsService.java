package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import com.openopportunity.admin.dto.AdminCommunityInterestSummary;
import com.openopportunity.admin.dto.AdminPartnershipReportStats;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.idea.IdeaStatus;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminReportsService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final MockInterviewSessionRepository mockInterviewSessionRepository;
    private final IdeaRepository ideaRepository;
    private final IdeaInterestRepository ideaInterestRepository;
    private final CommunityInterestSubmissionRepository communityInterestSubmissionRepository;

    public AdminReportsService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            MockInterviewSessionRepository mockInterviewSessionRepository,
            IdeaRepository ideaRepository,
            IdeaInterestRepository ideaInterestRepository,
            CommunityInterestSubmissionRepository communityInterestSubmissionRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
        this.ideaRepository = ideaRepository;
        this.ideaInterestRepository = ideaInterestRepository;
        this.communityInterestSubmissionRepository = communityInterestSubmissionRepository;
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
}
