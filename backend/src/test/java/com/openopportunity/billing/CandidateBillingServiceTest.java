package com.openopportunity.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.dto.CandidateBillingSummary;
import com.openopportunity.billing.exception.BillingTransactionNotFoundException;
import com.openopportunity.billing.exception.PaidPlanRequiresCheckoutException;
import com.openopportunity.billing.exception.PaymentGatewayUnavailableException;
import com.openopportunity.billing.exception.SamePlanException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CandidateBillingServiceTest {

    private static final String WEBHOOK_SECRET = "test-webhook-secret";

    @Mock
    private CandidateSubscriptionRepository subscriptionRepository;

    @Mock
    private BillingTransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    private CandidateBillingService billingService;

    @BeforeEach
    void setUp() {
        // Blank key id/secret — razorpayClient stays null, same as a real deployment with no
        // Razorpay creds configured. Only handleWebhookEvent needs a real (non-blank) secret,
        // since that path never touches the Razorpay HTTP client.
        billingService = new CandidateBillingService(
                subscriptionRepository, transactionRepository, userRepository, "", "", WEBHOOK_SECRET);
    }

    @Test
    void changePlanDowngradesToFreeInstantly() {
        UUID candidateId = UUID.randomUUID();
        CandidateSubscription existing = new CandidateSubscription(candidateId, SubscriptionPlan.PLUS);
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.of(existing));
        when(subscriptionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(transactionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of());

        CandidateBillingSummary summary = billingService.changePlan(candidateId, SubscriptionPlan.FREE);

        assertThat(summary.currentPlan()).isEqualTo(SubscriptionPlan.FREE);
        verify(transactionRepository).save(any());
    }

    @Test
    void changePlanClearsTheValidityPeriodOnDowngradeToFree() {
        UUID candidateId = UUID.randomUUID();
        CandidateSubscription existing = new CandidateSubscription(candidateId, SubscriptionPlan.PLUS);
        existing.changePlan(SubscriptionPlan.PLUS, Instant.now().plus(Duration.ofDays(10)));
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.of(existing));
        when(transactionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of());

        CandidateBillingSummary summary = billingService.changePlan(candidateId, SubscriptionPlan.FREE);

        assertThat(summary.currentPlanValidUntil()).isNull();
        assertThat(existing.getCurrentPeriodEnd()).isNull();
    }

    @Test
    void changePlanRejectsSwitchingToTheSamePlan() {
        UUID candidateId = UUID.randomUUID();
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingService.changePlan(candidateId, SubscriptionPlan.FREE))
                .isInstanceOf(SamePlanException.class);
    }

    @Test
    void changePlanRejectsPaidPlansAndPointsToCheckout() {
        UUID candidateId = UUID.randomUUID();

        assertThatThrownBy(() -> billingService.changePlan(candidateId, SubscriptionPlan.PLUS))
                .isInstanceOf(PaidPlanRequiresCheckoutException.class);
        assertThatThrownBy(() -> billingService.changePlan(candidateId, SubscriptionPlan.PRO))
                .isInstanceOf(PaidPlanRequiresCheckoutException.class);
    }

    @Test
    void initiateCheckoutFailsCleanlyWhenNoGatewayIsConfigured() {
        UUID candidateId = UUID.randomUUID();

        assertThatThrownBy(() -> billingService.initiateCheckout(candidateId, SubscriptionPlan.PLUS))
                .isInstanceOf(PaymentGatewayUnavailableException.class);
    }

    @Test
    void initiateCheckoutAllowsRenewingTheCurrentPlan() {
        // No RazorpayClient is configured in this test (blank creds), so any initiateCheckout
        // call fails with PaymentGatewayUnavailableException regardless of plan — the point here
        // is that it must NOT fail earlier with SamePlanException just because the candidate
        // already holds this plan. Since plans now expire (see expireOverdueSubscriptions),
        // checking out for the plan you already have is a legitimate renewal, not a no-op.
        UUID candidateId = UUID.randomUUID();

        assertThatThrownBy(() -> billingService.initiateCheckout(candidateId, SubscriptionPlan.PLUS))
                .isInstanceOf(PaymentGatewayUnavailableException.class);
    }

    @Test
    void verifyCheckoutRejectsAnUnknownTransaction() {
        UUID candidateId = UUID.randomUUID();
        UUID transactionId = UUID.randomUUID();
        when(transactionRepository.findById(transactionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> billingService.verifyCheckout(candidateId, transactionId, "order_1", "pay_1", "sig"))
                .isInstanceOf(BillingTransactionNotFoundException.class);
    }

    @Test
    void verifyCheckoutRejectsATransactionOwnedBySomeoneElse() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(ownerId, SubscriptionPlan.PLUS, "order_1");
        when(transactionRepository.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        assertThatThrownBy(
                        () -> billingService.verifyCheckout(otherId, transaction.getId(), "order_1", "pay_1", "sig"))
                .isInstanceOf(BillingTransactionNotFoundException.class);
    }

    @Test
    void verifyCheckoutOnAnAlreadySettledTransactionJustReportsCurrentState() {
        UUID candidateId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_1");
        transaction.markPaid("pay_already_processed");
        when(transactionRepository.findById(transaction.getId())).thenReturn(Optional.of(transaction));
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.empty());
        when(transactionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId)).thenReturn(List.of());

        CandidateBillingSummary summary =
                billingService.verifyCheckout(candidateId, transaction.getId(), "order_1", "pay_1", "sig");

        assertThat(summary.currentPlan()).isEqualTo(SubscriptionPlan.FREE);
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void generateInvoiceProducesAPdfForAPaidTransaction() {
        UUID candidateId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_1");
        transaction.markPaid("pay_1");
        transaction.onCreate(); // normally set by JPA's @PrePersist on save; this test never persists
        when(transactionRepository.findById(transaction.getId())).thenReturn(Optional.of(transaction));
        when(userRepository.findById(candidateId))
                .thenReturn(Optional.of(new User("candidate@example.com", "hash", "Jordan Candidate", UserRole.CANDIDATE)));

        byte[] pdf = billingService.generateInvoice(candidateId, transaction.getId());

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
    }

    @Test
    void generateInvoiceRejectsATransactionThatWasNeverPaid() {
        UUID candidateId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_1");
        when(transactionRepository.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        assertThatThrownBy(() -> billingService.generateInvoice(candidateId, transaction.getId()))
                .isInstanceOf(BillingTransactionNotFoundException.class);
    }

    @Test
    void generateInvoiceRejectsATransactionOwnedBySomeoneElse() {
        UUID ownerId = UUID.randomUUID();
        UUID otherId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(ownerId, SubscriptionPlan.PLUS, "order_1");
        transaction.markPaid("pay_1");
        when(transactionRepository.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        assertThatThrownBy(() -> billingService.generateInvoice(otherId, transaction.getId()))
                .isInstanceOf(BillingTransactionNotFoundException.class);
    }

    @Test
    void handleWebhookEventIgnoresEventsWhenNoWebhookSecretIsConfigured() {
        CandidateBillingService noSecretService = new CandidateBillingService(
                subscriptionRepository, transactionRepository, userRepository, "", "", "");

        noSecretService.handleWebhookEvent("{\"event\":\"payment.captured\"}", "any-signature");

        verify(transactionRepository, never()).findByRazorpayOrderId(any());
    }

    @Test
    void handleWebhookEventAppliesAPaymentCapturedEventWithAValidSignature() throws Exception {
        UUID candidateId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_webhook_1");
        when(transactionRepository.findByRazorpayOrderId("order_webhook_1")).thenReturn(Optional.of(transaction));
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.empty());

        String payload =
                "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{"
                        + "\"id\":\"pay_webhook_1\",\"order_id\":\"order_webhook_1\"}}}}";
        String signature = hmacSha256Hex(payload, WEBHOOK_SECRET);

        billingService.handleWebhookEvent(payload, signature);

        assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.PAID);
        assertThat(transaction.getRazorpayPaymentId()).isEqualTo("pay_webhook_1");
        verify(subscriptionRepository).save(any());
    }

    @Test
    void handleWebhookEventSetsA30DayValidityPeriodOnTheSubscription() throws Exception {
        UUID candidateId = UUID.randomUUID();
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_period_1");
        when(transactionRepository.findByRazorpayOrderId("order_period_1")).thenReturn(Optional.of(transaction));
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.empty());
        ArgumentCaptor<CandidateSubscription> savedSubscription = ArgumentCaptor.forClass(CandidateSubscription.class);

        String payload =
                "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{"
                        + "\"id\":\"pay_period_1\",\"order_id\":\"order_period_1\"}}}}";
        String signature = hmacSha256Hex(payload, WEBHOOK_SECRET);

        billingService.handleWebhookEvent(payload, signature);

        verify(subscriptionRepository).save(savedSubscription.capture());
        Instant validUntil = savedSubscription.getValue().getCurrentPeriodEnd();
        assertThat(validUntil).isAfter(Instant.now().plus(Duration.ofDays(29)));
        assertThat(validUntil).isBefore(Instant.now().plus(Duration.ofDays(31)));
    }

    @Test
    void handleWebhookEventStacksRemainingDaysWhenRenewingBeforeExpiry() throws Exception {
        UUID candidateId = UUID.randomUUID();
        CandidateSubscription existing = new CandidateSubscription(candidateId, SubscriptionPlan.PLUS);
        Instant tenDaysLeft = Instant.now().plus(Duration.ofDays(10));
        existing.changePlan(SubscriptionPlan.PLUS, tenDaysLeft);
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.of(existing));
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_stack_1");
        when(transactionRepository.findByRazorpayOrderId("order_stack_1")).thenReturn(Optional.of(transaction));

        String payload =
                "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{"
                        + "\"id\":\"pay_stack_1\",\"order_id\":\"order_stack_1\"}}}}";
        String signature = hmacSha256Hex(payload, WEBHOOK_SECRET);

        billingService.handleWebhookEvent(payload, signature);

        // Should land ~40 days out (10 remaining + a fresh 30), not just ~30.
        Instant validUntil = existing.getCurrentPeriodEnd();
        assertThat(validUntil).isAfter(Instant.now().plus(Duration.ofDays(39)));
        assertThat(validUntil).isBefore(Instant.now().plus(Duration.ofDays(41)));
    }

    @Test
    void handleWebhookEventDoesNotStackWhenThePreviousPeriodAlreadyLapsed() throws Exception {
        UUID candidateId = UUID.randomUUID();
        CandidateSubscription existing = new CandidateSubscription(candidateId, SubscriptionPlan.PLUS);
        existing.changePlan(SubscriptionPlan.PLUS, Instant.now().minus(Duration.ofDays(5)));
        when(subscriptionRepository.findByCandidateId(candidateId)).thenReturn(Optional.of(existing));
        BillingTransaction transaction = new BillingTransaction(candidateId, SubscriptionPlan.PLUS, "order_lapsed_1");
        when(transactionRepository.findByRazorpayOrderId("order_lapsed_1")).thenReturn(Optional.of(transaction));

        String payload =
                "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{"
                        + "\"id\":\"pay_lapsed_1\",\"order_id\":\"order_lapsed_1\"}}}}";
        String signature = hmacSha256Hex(payload, WEBHOOK_SECRET);

        billingService.handleWebhookEvent(payload, signature);

        Instant validUntil = existing.getCurrentPeriodEnd();
        assertThat(validUntil).isAfter(Instant.now().plus(Duration.ofDays(29)));
        assertThat(validUntil).isBefore(Instant.now().plus(Duration.ofDays(31)));
    }

    @Test
    void expireOverdueSubscriptionsDowngradesLapsedPlansAndRecordsAFreeTransaction() {
        UUID candidateId = UUID.randomUUID();
        CandidateSubscription lapsed = new CandidateSubscription(candidateId, SubscriptionPlan.PLUS);
        lapsed.changePlan(SubscriptionPlan.PLUS, Instant.now().minus(Duration.ofDays(1)));
        when(subscriptionRepository.findByCurrentPeriodEndBeforeAndPlanNot(any(), eq(SubscriptionPlan.FREE)))
                .thenReturn(List.of(lapsed));

        billingService.expireOverdueSubscriptions();

        assertThat(lapsed.getPlan()).isEqualTo(SubscriptionPlan.FREE);
        assertThat(lapsed.getCurrentPeriodEnd()).isNull();
        verify(subscriptionRepository).save(lapsed);
        verify(transactionRepository).save(any());
    }

    @Test
    void handleWebhookEventIgnoresAnInvalidSignature() {
        String payload = "{\"event\":\"payment.captured\"}";

        billingService.handleWebhookEvent(payload, "not-a-real-signature");

        verify(transactionRepository, never()).findByRazorpayOrderId(any());
    }

    private static String hmacSha256Hex(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte b : hash) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
