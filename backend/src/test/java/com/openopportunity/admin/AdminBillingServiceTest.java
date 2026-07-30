package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.admin.dto.AdminBillingStats;
import com.openopportunity.admin.dto.AdminInvoiceSummary;
import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.BillingTransaction;
import com.openopportunity.billing.BillingTransactionRepository;
import com.openopportunity.billing.CandidateSubscription;
import com.openopportunity.billing.CandidateSubscriptionRepository;
import com.openopportunity.billing.CompanyBillingTransaction;
import com.openopportunity.billing.CompanyBillingTransactionRepository;
import com.openopportunity.billing.CompanySubscription;
import com.openopportunity.billing.CompanySubscriptionPlan;
import com.openopportunity.billing.CompanySubscriptionRepository;
import com.openopportunity.billing.SubscriptionPlan;
import com.openopportunity.billing.TransactionStatus;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminBillingServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateSubscriptionRepository candidateSubscriptionRepository;

    @Mock
    private CompanySubscriptionRepository companySubscriptionRepository;

    @Mock
    private BillingTransactionRepository candidateTransactionRepository;

    @Mock
    private CompanyBillingTransactionRepository companyTransactionRepository;

    private AdminBillingService adminBillingService;

    @BeforeEach
    void setUp() {
        adminBillingService = new AdminBillingService(
                userRepository,
                candidateSubscriptionRepository,
                companySubscriptionRepository,
                candidateTransactionRepository,
                companyTransactionRepository);
    }

    @Test
    void getStatsCombinesCandidateAndCompanyMrrAndActiveCounts() {
        CandidateSubscription plusSub = new CandidateSubscription(UUID.randomUUID(), SubscriptionPlan.PLUS);
        CompanySubscription growthSub = new CompanySubscription(UUID.randomUUID(), CompanySubscriptionPlan.GROWTH);
        when(candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(eq(SubscriptionPlan.FREE), any()))
                .thenReturn(List.of(plusSub));
        when(companySubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(
                        eq(CompanySubscriptionPlan.FREE), any()))
                .thenReturn(List.of(growthSub));
        when(candidateTransactionRepository.countByPlanAndCreatedAtBetween(eq(SubscriptionPlan.FREE), any(), any()))
                .thenReturn(3L);
        when(companyTransactionRepository.countByPlanAndCreatedAtBetween(
                        eq(CompanySubscriptionPlan.FREE), any(), any()))
                .thenReturn(1L);

        AdminBillingStats stats = adminBillingService.getStats();

        assertThat(stats.monthlyRecurringRevenueRupees()).isEqualTo(249 + 399);
        assertThat(stats.activeSubscriptions()).isEqualTo(2L);
        assertThat(stats.churnedThisMonth()).isEqualTo(4L);
    }

    @Test
    void getInvoiceHistoryCombinesAndSortsCandidateAndCompanyTransactionsNewestFirst() {
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        User company = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        BillingTransaction older = new BillingTransaction(candidate.getId(), SubscriptionPlan.PLUS, "order_1");
        older.markPaid("pay_1");
        CompanyBillingTransaction newer =
                new CompanyBillingTransaction(company.getId(), CompanySubscriptionPlan.GROWTH, "order_2");
        // createdAt is normally set by JPA's @PrePersist on save (see BillingTransaction.onCreate,
        // package-private in a different package) — these entities are never persisted here, so
        // it has to be set directly for the sort in getInvoiceHistory to have something to compare.
        ReflectionTestUtils.setField(older, "createdAt", Instant.now().minus(Duration.ofDays(1)));
        ReflectionTestUtils.setField(newer, "createdAt", Instant.now());
        when(candidateTransactionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(older));
        when(companyTransactionRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(newer));
        when(userRepository.findById(candidate.getId())).thenReturn(Optional.of(candidate));
        when(userRepository.findById(company.getId())).thenReturn(Optional.of(company));

        List<AdminInvoiceSummary> invoices = adminBillingService.getInvoiceHistory();

        assertThat(invoices).extracting(AdminInvoiceSummary::name)
                .containsExactly("Vertex Robotics", "Rohan Mehta");
        assertThat(invoices).filteredOn(invoice -> invoice.name().equals("Rohan Mehta"))
                .first()
                .satisfies(invoice -> {
                    assertThat(invoice.plan()).isEqualTo("Plus");
                    assertThat(invoice.status()).isEqualTo(TransactionStatus.PAID);
                    assertThat(invoice.amountRupees()).isEqualTo(249);
                });
    }

    @Test
    void startOfCurrentMonthWindowIsUsedForChurnCounting() {
        // Sanity check that the window passed to countByPlanAndCreatedAtBetween covers "this
        // month so far" rather than an arbitrary fixed span — start should be within the last
        // ~31 days and never after now.
        when(candidateSubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(any(), any()))
                .thenReturn(List.of());
        when(companySubscriptionRepository.findByPlanNotAndCurrentPeriodEndAfter(any(), any()))
                .thenReturn(List.of());
        when(candidateTransactionRepository.countByPlanAndCreatedAtBetween(any(), any(), any())).thenReturn(0L);
        when(companyTransactionRepository.countByPlanAndCreatedAtBetween(any(), any(), any())).thenReturn(0L);

        adminBillingService.getStats();

        ArgumentCaptor<Instant> captor = ArgumentCaptor.forClass(Instant.class);
        verify(candidateTransactionRepository)
                .countByPlanAndCreatedAtBetween(eq(SubscriptionPlan.FREE), captor.capture(), any());
        assertThat(captor.getValue()).isAfter(Instant.now().minus(Duration.ofDays(31)));
        assertThat(captor.getValue()).isBeforeOrEqualTo(Instant.now());
    }
}
