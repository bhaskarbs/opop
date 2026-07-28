package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminReportsService {

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final MockInterviewSessionRepository mockInterviewSessionRepository;

    public AdminReportsService(
            UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            MockInterviewSessionRepository mockInterviewSessionRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.mockInterviewSessionRepository = mockInterviewSessionRepository;
    }

    @Transactional(readOnly = true)
    public AdminCandidateReportStats getCandidateStats() {
        return new AdminCandidateReportStats(
                userRepository.countByRole(UserRole.CANDIDATE),
                candidateProfileRepository.countByResumeStorageKeyIsNotNull(),
                mockInterviewSessionRepository.count());
    }
}
