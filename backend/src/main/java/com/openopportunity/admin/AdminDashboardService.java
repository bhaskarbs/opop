package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminDashboardStats;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final JobRepository jobRepository;

    public AdminDashboardService(UserRepository userRepository, JobRepository jobRepository) {
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
    }

    @Transactional(readOnly = true)
    public AdminDashboardStats getStats() {
        return new AdminDashboardStats(
                userRepository.countByRole(UserRole.CANDIDATE),
                userRepository.countByRole(UserRole.COMPANY),
                jobRepository.countByStatus(JobStatus.ACTIVE));
    }
}
