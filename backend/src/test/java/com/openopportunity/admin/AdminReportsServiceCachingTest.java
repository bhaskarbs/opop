package com.openopportunity.admin;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.CandidateProfileRepository;
import com.openopportunity.auth.CompanyProfileRepository;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.BillingTransactionRepository;
import com.openopportunity.billing.CompanyBillingTransactionRepository;
import com.openopportunity.billing.TransactionStatus;
import com.openopportunity.community.CommunityInterestSubmissionRepository;
import com.openopportunity.config.CacheConfig;
import com.openopportunity.idea.IdeaInterestRepository;
import com.openopportunity.idea.IdeaRepository;
import com.openopportunity.job.JobRepository;
import com.openopportunity.mockinterview.MockInterviewSessionRepository;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * {@link AdminReportsServiceTest} constructs the service with {@code new}, which bypasses the
 * Spring AOP proxy entirely and wouldn't notice if {@code @Cacheable} stopped working. This test
 * runs the service inside a real (lightweight, DB-free) Spring context so the caching behavior
 * itself is under test, not just the calculations.
 */
class AdminReportsServiceCachingTest {

    @Configuration
    @Import(CacheConfig.class)
    static class TestConfig {
        @Bean
        UserRepository userRepository() {
            return mock(UserRepository.class);
        }

        @Bean
        CandidateProfileRepository candidateProfileRepository() {
            return mock(CandidateProfileRepository.class);
        }

        @Bean
        MockInterviewSessionRepository mockInterviewSessionRepository() {
            return mock(MockInterviewSessionRepository.class);
        }

        @Bean
        IdeaRepository ideaRepository() {
            return mock(IdeaRepository.class);
        }

        @Bean
        IdeaInterestRepository ideaInterestRepository() {
            return mock(IdeaInterestRepository.class);
        }

        @Bean
        CommunityInterestSubmissionRepository communityInterestSubmissionRepository() {
            return mock(CommunityInterestSubmissionRepository.class);
        }

        @Bean
        BillingTransactionRepository billingTransactionRepository() {
            return mock(BillingTransactionRepository.class);
        }

        @Bean
        CompanyBillingTransactionRepository companyBillingTransactionRepository() {
            return mock(CompanyBillingTransactionRepository.class);
        }

        @Bean
        CompanyProfileRepository companyProfileRepository() {
            return mock(CompanyProfileRepository.class);
        }

        @Bean
        JobRepository jobRepository() {
            return mock(JobRepository.class);
        }

        @Bean
        AdminReportsService adminReportsService(
                UserRepository userRepository,
                CandidateProfileRepository candidateProfileRepository,
                MockInterviewSessionRepository mockInterviewSessionRepository,
                IdeaRepository ideaRepository,
                IdeaInterestRepository ideaInterestRepository,
                CommunityInterestSubmissionRepository communityInterestSubmissionRepository,
                BillingTransactionRepository billingTransactionRepository,
                CompanyBillingTransactionRepository companyBillingTransactionRepository,
                CompanyProfileRepository companyProfileRepository,
                JobRepository jobRepository) {
            return new AdminReportsService(
                    userRepository,
                    candidateProfileRepository,
                    mockInterviewSessionRepository,
                    ideaRepository,
                    ideaInterestRepository,
                    communityInterestSubmissionRepository,
                    billingTransactionRepository,
                    companyBillingTransactionRepository,
                    companyProfileRepository,
                    jobRepository);
        }
    }

    private AnnotationConfigApplicationContext context;

    @AfterEach
    void tearDown() {
        if (context != null) {
            context.close();
        }
    }

    @Test
    void getCandidateStatsHitsRepositoriesOnlyOnceAcrossRepeatedCalls() {
        context = new AnnotationConfigApplicationContext(TestConfig.class);
        UserRepository userRepository = context.getBean(UserRepository.class);
        CandidateProfileRepository candidateProfileRepository =
                context.getBean(CandidateProfileRepository.class);
        MockInterviewSessionRepository mockInterviewSessionRepository =
                context.getBean(MockInterviewSessionRepository.class);
        when(userRepository.countByRole(UserRole.CANDIDATE)).thenReturn(120L);
        when(candidateProfileRepository.countByResumeStorageKeyIsNotNull()).thenReturn(95L);
        when(mockInterviewSessionRepository.count()).thenReturn(340L);

        AdminReportsService service = context.getBean(AdminReportsService.class);
        service.getCandidateStats();
        service.getCandidateStats();
        service.getCandidateStats();

        verify(userRepository, times(1)).countByRole(UserRole.CANDIDATE);
        verify(candidateProfileRepository, times(1)).countByResumeStorageKeyIsNotNull();
        verify(mockInterviewSessionRepository, times(1)).count();
    }

    @Test
    void getFinancialStatsIsCachedIndependentlyOfOtherReportMethods() {
        context = new AnnotationConfigApplicationContext(TestConfig.class);
        BillingTransactionRepository billingTransactionRepository =
                context.getBean(BillingTransactionRepository.class);
        CompanyBillingTransactionRepository companyBillingTransactionRepository =
                context.getBean(CompanyBillingTransactionRepository.class);
        when(billingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID)).thenReturn(1_000L);
        when(companyBillingTransactionRepository.sumAmountRupeesByStatus(TransactionStatus.PAID))
                .thenReturn(2_000L);

        AdminReportsService service = context.getBean(AdminReportsService.class);
        service.getFinancialStats();
        service.getFinancialStats();

        verify(billingTransactionRepository, times(1)).sumAmountRupeesByStatus(TransactionStatus.PAID);
        verify(companyBillingTransactionRepository, times(1)).sumAmountRupeesByStatus(TransactionStatus.PAID);
    }

    @Test
    void getCommunityInterestSubmissionsIsCached() {
        context = new AnnotationConfigApplicationContext(TestConfig.class);
        CommunityInterestSubmissionRepository communityInterestSubmissionRepository =
                context.getBean(CommunityInterestSubmissionRepository.class);
        when(communityInterestSubmissionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        AdminReportsService service = context.getBean(AdminReportsService.class);
        service.getCommunityInterestSubmissions();
        service.getCommunityInterestSubmissions();

        verify(communityInterestSubmissionRepository, times(1)).findAllByOrderByCreatedAtDesc();
    }
}
