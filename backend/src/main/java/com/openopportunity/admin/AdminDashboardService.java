package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminDashboardStats;
import com.openopportunity.admin.dto.MonthlyApplicationsByPath;
import com.openopportunity.application.ApplicationRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private static final int APPLICATIONS_BY_PATH_MONTHS = 6;

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
                ideaInterestRepository.countDistinctCandidateInterestedUsers(),
                computeApplicationsByPath());
    }

    private List<MonthlyApplicationsByPath> computeApplicationsByPath() {
        List<MonthlyApplicationsByPath> months = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now(ZoneOffset.UTC);
        for (int i = APPLICATIONS_BY_PATH_MONTHS - 1; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            Instant start = month.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            Instant end = month.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
            months.add(new MonthlyApplicationsByPath(
                    month.atDay(1).toString(),
                    applicationRepository.countByAppliedAtBetween(start, end),
                    ideaInterestRepository.countByCreatedAtBetween(start, end),
                    communityInterestSubmissionRepository.countByCreatedAtBetween(start, end)));
        }
        return months;
    }
}
