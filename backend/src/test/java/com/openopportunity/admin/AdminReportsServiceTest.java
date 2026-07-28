package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
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

    private AdminReportsService adminReportsService;

    @BeforeEach
    void setUp() {
        adminReportsService =
                new AdminReportsService(userRepository, candidateProfileRepository, mockInterviewSessionRepository);
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
}
