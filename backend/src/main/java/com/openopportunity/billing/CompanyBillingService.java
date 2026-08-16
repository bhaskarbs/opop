package com.openopportunity.billing;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.dto.AdminCompanySubscriptionSummary;
import com.openopportunity.billing.dto.CompanyBillingSummary;
import com.openopportunity.billing.dto.CompanyBillingTransactionSummary;
import com.openopportunity.billing.dto.CompanyCheckoutSummary;
import com.openopportunity.billing.exception.BillingTransactionNotFoundException;
import com.openopportunity.billing.exception.CompanyNotFoundException;
import com.openopportunity.billing.exception.CompanyPaidPlanRequiresCheckoutException;
import com.openopportunity.billing.exception.CompanyPlanNotAdminAssignableException;
import com.openopportunity.billing.exception.PaymentGatewayUnavailableException;
import com.openopportunity.billing.exception.PaymentVerificationFailedException;
import com.openopportunity.billing.exception.SamePlanException;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Company counterpart to CandidateBillingService — mirrors its logic exactly (free downgrades
 * are instant, upgrading to a paid plan requires a real Razorpay payment), kept as a fully
 * separate service/table pair rather than a shared one, same "duplicate per role" precedent as
 * CompanyProfile vs CandidateProfile. */
@Service
public class CompanyBillingService {

    // Each paid period is 30 days. Renewing before the current period lapses stacks the new
    // 30 days on top of whatever's left (see applyPaidTransaction) rather than discarding the
    // remaining time; renewing after it's already lapsed just starts a fresh 30 days from now.
    private static final Duration PAID_PLAN_PERIOD = Duration.ofDays(30);

    private final CompanySubscriptionRepository subscriptionRepository;
    private final CompanyBillingTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;
    private final String razorpayWebhookSecret;
    private final RazorpayClient razorpayClient;

    public CompanyBillingService(
            CompanySubscriptionRepository subscriptionRepository,
            CompanyBillingTransactionRepository transactionRepository,
            UserRepository userRepository,
            @Value("${app.razorpay.key-id}") String razorpayKeyId,
            @Value("${app.razorpay.key-secret}") String razorpayKeySecret,
            @Value("${app.razorpay.webhook-secret}") String razorpayWebhookSecret) {
        this.subscriptionRepository = subscriptionRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.razorpayKeyId = razorpayKeyId;
        this.razorpayKeySecret = razorpayKeySecret;
        this.razorpayWebhookSecret = razorpayWebhookSecret;

        RazorpayClient created;
        try {
            created = razorpayKeyId.isBlank() || razorpayKeySecret.isBlank()
                    ? null
                    : new RazorpayClient(razorpayKeyId, razorpayKeySecret);
        } catch (RazorpayException ex) {
            created = null;
        }
        this.razorpayClient = created;
    }

    @Transactional(readOnly = true)
    public CompanyBillingSummary getBilling(UUID companyId) {
        return summaryFor(companyId);
    }

    @Transactional(readOnly = true)
    public List<AdminCompanySubscriptionSummary> adminListCompanySubscriptions() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.COMPANY)
                .map(user -> {
                    CompanySubscription subscription =
                            subscriptionRepository.findByCompanyId(user.getId()).orElse(null);
                    CompanySubscriptionPlan plan =
                            subscription == null ? CompanySubscriptionPlan.FREE : subscription.getPlan();
                    Instant validUntil = subscription == null ? null : subscription.getCurrentPeriodEnd();
                    Instant upgradedAt = subscription == null ? null : subscription.getUpdatedAt();
                    return new AdminCompanySubscriptionSummary(
                            user.getId(), user.getFullName(), user.getEmail(), plan, validUntil, upgradedAt);
                })
                .toList();
    }

    /** Admin-only direct plan change (comps / support fixes) — deliberately bypasses the paid
     * Razorpay checkout the public path requires. Free and Growth only (mirrors
     * CandidateBillingService.adminSetPlan's Free/Plus-only policy — Enterprise stays
     * checkout-only); granting Growth gets a fresh PAID_PLAN_PERIOD so the daily expiry sweep
     * treats it exactly like a purchased period, and a ₹0 comp transaction is recorded for the
     * audit trail. */
    @Transactional
    public AdminCompanySubscriptionSummary adminSetPlan(UUID companyId, CompanySubscriptionPlan plan) {
        if (plan != CompanySubscriptionPlan.FREE && plan != CompanySubscriptionPlan.GROWTH) {
            throw new CompanyPlanNotAdminAssignableException(plan);
        }
        User company = userRepository
                .findById(companyId)
                .filter(user -> user.getRole() == UserRole.COMPANY)
                .orElseThrow(() -> new CompanyNotFoundException(companyId));

        Instant now = Instant.now();
        Instant currentPeriodEnd = plan == CompanySubscriptionPlan.FREE ? null : now.plus(PAID_PLAN_PERIOD);
        Instant currentPeriodStart = plan == CompanySubscriptionPlan.FREE ? null : now;
        CompanySubscription subscription = subscriptionRepository
                .findByCompanyId(companyId)
                .orElseGet(() -> new CompanySubscription(companyId, plan));
        subscription.changePlan(plan, currentPeriodStart, currentPeriodEnd);
        subscriptionRepository.save(subscription);
        transactionRepository.save(CompanyBillingTransaction.adminGrant(companyId, plan));

        // now rather than subscription.getUpdatedAt() — see CandidateBillingService.adminSetPlan's
        // comment on why the getter can be stale here.
        return new AdminCompanySubscriptionSummary(
                company.getId(), company.getFullName(), company.getEmail(), plan, currentPeriodEnd, now);
    }

    /** For CandidateSearchService's contact-reveal quota gate — cheaper than getBilling() when
     * the caller only needs the plan and the current billing period's start (to count reveals
     * made since then), not the full history. */
    @Transactional(readOnly = true)
    public PlanPeriod getPlanPeriod(UUID companyId) {
        CompanySubscription subscription = subscriptionRepository.findByCompanyId(companyId).orElse(null);
        CompanySubscriptionPlan plan = subscription == null ? CompanySubscriptionPlan.FREE : subscription.getPlan();
        Instant periodStart = subscription == null ? null : subscription.getCurrentPeriodStart();
        Instant periodEnd = subscription == null ? null : subscription.getCurrentPeriodEnd();
        return new PlanPeriod(plan, periodStart, periodEnd);
    }

    public record PlanPeriod(CompanySubscriptionPlan plan, Instant currentPeriodStart, Instant currentPeriodEnd) {}

    /** Downgrade-to-Free only — a paid plan can only be granted through a real checkout. */
    @Transactional
    public CompanyBillingSummary changePlan(UUID companyId, CompanySubscriptionPlan plan) {
        if (plan != CompanySubscriptionPlan.FREE) {
            throw new CompanyPaidPlanRequiresCheckoutException();
        }
        if (currentPlan(companyId) == plan) {
            throw new SamePlanException();
        }

        CompanySubscription subscription = subscriptionRepository
                .findByCompanyId(companyId)
                .orElseGet(() -> new CompanySubscription(companyId, plan));
        subscription.changePlan(plan, null, null);
        subscriptionRepository.save(subscription);
        transactionRepository.save(new CompanyBillingTransaction(companyId, plan));

        return summaryFor(companyId);
    }

    /** Deliberately allows checkout for a plan the company already holds — that's a renewal
     * (plans now expire after PAID_PLAN_PERIOD, see applyPaidTransaction), not a redundant
     * no-op, so it must go through the same paid flow as any other upgrade. */
    @Transactional
    public CompanyCheckoutSummary initiateCheckout(UUID companyId, CompanySubscriptionPlan plan) {
        if (razorpayClient == null) {
            throw new PaymentGatewayUnavailableException();
        }

        String razorpayOrderId;
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", plan.getAmountRupees() * 100);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", UUID.randomUUID().toString());
            Order order = razorpayClient.orders.create(orderRequest);
            razorpayOrderId = order.get("id");
        } catch (RazorpayException ex) {
            throw new PaymentGatewayUnavailableException();
        }

        CompanyBillingTransaction transaction = new CompanyBillingTransaction(companyId, plan, razorpayOrderId);
        transactionRepository.save(transaction);

        return new CompanyCheckoutSummary(
                transaction.getId(), razorpayOrderId, razorpayKeyId, plan.getAmountRupees(), plan);
    }

    /** The client-side checkout callback — the fast confirmation path. handleWebhookEvent is the
     * fallback for when this never fires (browser closed before the callback ran). */
    @Transactional
    public CompanyBillingSummary verifyCheckout(
            UUID companyId,
            UUID transactionId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {
        CompanyBillingTransaction transaction = transactionRepository
                .findById(transactionId)
                .filter(existing -> existing.getCompanyId().equals(companyId))
                .orElseThrow(() -> new BillingTransactionNotFoundException(transactionId));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            // Already settled — most likely the webhook got there first. Same end state either
            // way, so just report the current plan rather than erroring.
            return summaryFor(companyId);
        }

        JSONObject attributes = new JSONObject();
        attributes.put("razorpay_order_id", razorpayOrderId);
        attributes.put("razorpay_payment_id", razorpayPaymentId);
        attributes.put("razorpay_signature", razorpaySignature);

        boolean valid;
        try {
            valid = razorpayClient != null && Utils.verifyPaymentSignature(attributes, razorpayKeySecret);
        } catch (RazorpayException ex) {
            valid = false;
        }

        if (!valid) {
            transaction.markFailed();
            transactionRepository.save(transaction);
            throw new PaymentVerificationFailedException();
        }

        applyPaidTransaction(transaction, razorpayPaymentId);
        return summaryFor(companyId);
    }

    /** Only PAID transactions have a real invoice — same 404-for-not-found-and-not-owned pattern
     * as verifyCheckout. */
    @Transactional(readOnly = true)
    public byte[] generateInvoice(UUID companyId, UUID transactionId) {
        CompanyBillingTransaction transaction = transactionRepository
                .findById(transactionId)
                .filter(existing -> existing.getCompanyId().equals(companyId))
                .filter(existing -> existing.getStatus() == TransactionStatus.PAID)
                .orElseThrow(() -> new BillingTransactionNotFoundException(transactionId));
        User company = userRepository
                .findById(companyId)
                .orElseThrow(() -> new BillingTransactionNotFoundException(transactionId));

        return CompanyInvoicePdfGenerator.generate(transaction, company);
    }

    /** Server-to-server fallback for verifyCheckout — always verify-then-ignore rather than
     * throwing (see RazorpayWebhookController, which calls this alongside the candidate
     * equivalent and always returns 200 regardless of what either finds). */
    @Transactional
    public void handleWebhookEvent(String rawPayload, String signatureHeader) {
        if (razorpayWebhookSecret.isBlank() || signatureHeader == null) {
            return;
        }
        boolean valid;
        try {
            valid = Utils.verifyWebhookSignature(rawPayload, signatureHeader, razorpayWebhookSecret);
        } catch (RazorpayException ex) {
            valid = false;
        }
        if (!valid) {
            return;
        }

        JSONObject payload = new JSONObject(rawPayload);
        String event = payload.optString("event", "");
        JSONObject payloadEntity = payload.optJSONObject("payload");
        if (payloadEntity == null) {
            return;
        }

        if ("payment.captured".equals(event) || "order.paid".equals(event)) {
            JSONObject payment = extractEntity(payloadEntity, "payment");
            String orderId = payment == null ? null : payment.optString("order_id", null);
            String paymentId = payment == null ? null : payment.optString("id", null);
            if (orderId == null) return;
            transactionRepository.findByRazorpayOrderId(orderId).ifPresent(transaction -> {
                if (transaction.getStatus() == TransactionStatus.PENDING) {
                    applyPaidTransaction(transaction, paymentId);
                }
            });
        } else if ("payment.failed".equals(event)) {
            JSONObject payment = extractEntity(payloadEntity, "payment");
            String orderId = payment == null ? null : payment.optString("order_id", null);
            if (orderId == null) return;
            transactionRepository.findByRazorpayOrderId(orderId).ifPresent(transaction -> {
                if (transaction.getStatus() == TransactionStatus.PENDING) {
                    transaction.markFailed();
                    transactionRepository.save(transaction);
                }
            });
        }
    }

    private JSONObject extractEntity(JSONObject payloadEntity, String key) {
        JSONObject wrapper = payloadEntity.optJSONObject(key);
        return wrapper == null ? null : wrapper.optJSONObject("entity");
    }

    private void applyPaidTransaction(CompanyBillingTransaction transaction, String razorpayPaymentId) {
        transaction.markPaid(razorpayPaymentId);
        transactionRepository.save(transaction);

        CompanySubscription subscription = subscriptionRepository
                .findByCompanyId(transaction.getCompanyId())
                .orElseGet(() -> new CompanySubscription(transaction.getCompanyId(), transaction.getPlan()));

        Instant now = Instant.now();
        Instant currentPeriodEnd = subscription.getCurrentPeriodEnd();
        // Renewing before the current period lapses stacks the new period on top of the
        // remaining days; renewing after it's lapsed (or never had one) just starts fresh.
        Instant renewalBase = currentPeriodEnd != null && currentPeriodEnd.isAfter(now) ? currentPeriodEnd : now;
        // currentPeriodStart always resets to this exact payment, regardless of stacking — the
        // contact-reveal quota (see CandidateSearchService.getContactQuota) is meant to refresh
        // with every checkout/renewal, not accumulate across them.
        subscription.changePlan(transaction.getPlan(), now, renewalBase.plus(PAID_PLAN_PERIOD));
        subscriptionRepository.save(subscription);
    }

    /** Daily sweep for paid plans whose period has lapsed with no renewal — downgrades them to
     * Free and records the same kind of ₹0 "settled" transaction a manual Free downgrade
     * produces, so it reads identically in billing history. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void expireOverdueSubscriptions() {
        Instant now = Instant.now();
        List<CompanySubscription> overdue =
                subscriptionRepository.findByCurrentPeriodEndBeforeAndPlanNot(now, CompanySubscriptionPlan.FREE);
        for (CompanySubscription subscription : overdue) {
            subscription.changePlan(CompanySubscriptionPlan.FREE, null, null);
            subscriptionRepository.save(subscription);
            transactionRepository.save(
                    new CompanyBillingTransaction(subscription.getCompanyId(), CompanySubscriptionPlan.FREE));
        }
    }

    private CompanySubscriptionPlan currentPlan(UUID companyId) {
        return subscriptionRepository
                .findByCompanyId(companyId)
                .map(CompanySubscription::getPlan)
                .orElse(CompanySubscriptionPlan.FREE);
    }

    private CompanyBillingSummary summaryFor(UUID companyId) {
        CompanySubscription subscription = subscriptionRepository.findByCompanyId(companyId).orElse(null);
        CompanySubscriptionPlan plan = subscription == null ? CompanySubscriptionPlan.FREE : subscription.getPlan();
        Instant validUntil = subscription == null ? null : subscription.getCurrentPeriodEnd();
        return new CompanyBillingSummary(plan, validUntil, getHistory(companyId));
    }

    private List<CompanyBillingTransactionSummary> getHistory(UUID companyId) {
        return transactionRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).stream()
                .map(this::toSummary)
                .toList();
    }

    private CompanyBillingTransactionSummary toSummary(CompanyBillingTransaction transaction) {
        return new CompanyBillingTransactionSummary(
                transaction.getId(),
                transaction.getPlan(),
                transaction.getAmountRupees(),
                transaction.getStatus(),
                transaction.getCreatedAt());
    }
}
