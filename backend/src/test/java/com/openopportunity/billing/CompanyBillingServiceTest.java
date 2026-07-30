package com.openopportunity.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.dto.AdminCompanySubscriptionSummary;
import com.openopportunity.billing.exception.CompanyNotFoundException;
import com.openopportunity.billing.exception.CompanyPlanNotAdminAssignableException;
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

@ExtendWith(MockitoExtension.class)
class CompanyBillingServiceTest {

    @Mock
    private CompanySubscriptionRepository subscriptionRepository;

    @Mock
    private CompanyBillingTransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    private CompanyBillingService billingService;

    @BeforeEach
    void setUp() {
        // Blank key id/secret — razorpayClient stays null, same as a real deployment with no
        // Razorpay creds configured. None of these tests touch it.
        billingService =
                new CompanyBillingService(subscriptionRepository, transactionRepository, userRepository, "", "", "");
    }

    private User companyUser() {
        return new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
    }

    @Test
    void adminListCompanySubscriptionsExcludesNonCompanyUsersAndDefaultsToFree() {
        User company = companyUser();
        User candidate = new User("candidate@example.com", "hash", "Rohan Mehta", UserRole.CANDIDATE);
        when(userRepository.findAll()).thenReturn(List.of(company, candidate));
        when(subscriptionRepository.findByCompanyId(company.getId())).thenReturn(Optional.empty());

        List<AdminCompanySubscriptionSummary> subscriptions = billingService.adminListCompanySubscriptions();

        assertThat(subscriptions).hasSize(1);
        assertThat(subscriptions.get(0).companyName()).isEqualTo("Vertex Robotics");
        assertThat(subscriptions.get(0).plan()).isEqualTo(CompanySubscriptionPlan.FREE);
    }

    @Test
    void adminSetPlanGrantsGrowthAsASettledZeroRupeeTransaction() {
        User company = companyUser();
        when(userRepository.findById(company.getId())).thenReturn(Optional.of(company));
        when(subscriptionRepository.findByCompanyId(company.getId())).thenReturn(Optional.empty());

        AdminCompanySubscriptionSummary summary =
                billingService.adminSetPlan(company.getId(), CompanySubscriptionPlan.GROWTH);

        assertThat(summary.plan()).isEqualTo(CompanySubscriptionPlan.GROWTH);
        assertThat(summary.validUntil()).isAfter(Instant.now().plus(Duration.ofDays(29)));
        ArgumentCaptor<CompanyBillingTransaction> transactionCaptor =
                ArgumentCaptor.forClass(CompanyBillingTransaction.class);
        verify(transactionRepository).save(transactionCaptor.capture());
        assertThat(transactionCaptor.getValue().getAmountRupees()).isZero();
        assertThat(transactionCaptor.getValue().getStatus()).isEqualTo(TransactionStatus.PAID);
    }

    @Test
    void adminSetPlanRejectsEnterprise() {
        UUID companyId = UUID.randomUUID();

        assertThatThrownBy(() -> billingService.adminSetPlan(companyId, CompanySubscriptionPlan.ENTERPRISE))
                .isInstanceOf(CompanyPlanNotAdminAssignableException.class);
    }

    @Test
    void adminSetPlanRejectsMissingCompany() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingService.adminSetPlan(UUID.randomUUID(), CompanySubscriptionPlan.FREE))
                .isInstanceOf(CompanyNotFoundException.class);
    }
}
