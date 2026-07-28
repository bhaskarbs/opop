package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminDashboardStats;
import com.openopportunity.application.ApplicationRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final IdeaInterestRepository ideaInterestRepository;
    private final CommunityInterestSubmissionRepository communityInterestSubmissionRepository;
    private final ApplicationRepository applicationRepository;

    public AdminDashboardService(
            UserRepository userRepository,
            JobRepository jobRepository,
            IdeaInterestRepository ideaInterestRepository,
            CommunityInterestSubmissionRepository communityInterestSubmissionRepository,
            ApplicationRepository applicationRepository) {
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.ideaInterestRepository = ideaInterestRepository;
        this.communityInterestSubmissionRepository = communityInterestSubmissionRepository;
        this.applicationRepository = applicationRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardStats getStats() {
        return new AdminDashboardStats(
                userRepository.countByRole(UserRole.CANDIDATE),
                userRepository.countByRole(UserRole.COMPANY),
                jobRepository.countByStatus(JobStatus.ACTIVE),
                ideaInterestRepository.count(),
                communityInterestSubmissionRepository.count(),
                applicationRepository.countDistinctCandidates(),
                ideaInterestRepository.countDistinctCandidateInterestedUsers());
    }
}
