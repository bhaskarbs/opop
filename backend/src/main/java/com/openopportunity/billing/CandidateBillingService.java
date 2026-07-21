package com.openopportunity.billing;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.billing.dto.AdminCandidateSubscriptionSummary;
import com.openopportunity.billing.dto.BillingTransactionSummary;
import com.openopportunity.billing.dto.CandidateBillingSummary;
import com.openopportunity.billing.dto.CheckoutSummary;
import com.openopportunity.billing.exception.BillingTransactionNotFoundException;
import com.openopportunity.billing.exception.CandidateNotFoundException;
import com.openopportunity.billing.exception.PaidPlanRequiresCheckoutException;
import com.openopportunity.billing.exception.PaymentGatewayUnavailableException;
import com.openopportunity.billing.exception.PaymentVerificationFailedException;
import com.openopportunity.billing.exception.PlanNotAdminAssignableException;
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

/** Free downgrades are instant (no money involved). Upgrading to a paid plan requires an actual
 * successful Razorpay payment: initiateCheckout creates a real Order and a PENDING transaction;
 * the plan only changes once verifyCheckout (the client-side checkout callback, the fast path) or
 * handleWebhookEvent (the server-to-server fallback, in case the browser never calls back) marks
 * that transaction PAID. See docs/DEVELOPMENT_ROADMAP.md for why one-time Orders rather than
 * Razorpay Subscriptions — no auto-renewal in this phase. */
@Service
public class CandidateBillingService {

    // Each paid period is 30 days. Renewing before the current period lapses stacks the new
    // 30 days on top of whatever's left (see applyPaidTransaction) rather than discarding the
    // remaining time; renewing after it's already lapsed just starts a fresh 30 days from now.
    private static final Duration PAID_PLAN_PERIOD = Duration.ofDays(30);

    private final CandidateSubscriptionRepository subscriptionRepository;
    private final BillingTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final String razorpayKeyId;
    private final String razorpayKeySecret;
    private final String razorpayWebhookSecret;
    private final RazorpayClient razorpayClient;

    public CandidateBillingService(
            CandidateSubscriptionRepository subscriptionRepository,
            BillingTransactionRepository transactionRepository,
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
    public CandidateBillingSummary getBilling(UUID candidateId) {
        return summaryFor(candidateId);
    }

    /** For other services gating a paid perk (see IdeaService's contact-number gate on the
     * Plus plan) — cheaper than getBilling() when the caller only needs the plan, not history. */
    @Transactional(readOnly = true)
    public SubscriptionPlan getCurrentPlan(UUID candidateId) {
        return currentPlan(candidateId);
    }

    /** Downgrade-to-Free only — a paid plan can no longer be granted through this path (that
     * used to be an unauthenticated-payment security hole back when this was a full mock). */
    @Transactional
    public CandidateBillingSummary changePlan(UUID candidateId, SubscriptionPlan plan) {
        if (plan != SubscriptionPlan.FREE) {
            throw new PaidPlanRequiresCheckoutException();
        }
        if (currentPlan(candidateId) == plan) {
            throw new SamePlanException();
        }

        CandidateSubscription subscription = subscriptionRepository
                .findByCandidateId(candidateId)
                .orElseGet(() -> new CandidateSubscription(candidateId, plan));
        subscription.changePlan(plan, null);
        subscriptionRepository.save(subscription);
        transactionRepository.save(new BillingTransaction(candidateId, plan));

        return summaryFor(candidateId);
    }

    /** Admin view of every candidate's current plan (absent subscription row = FREE). Filters
     * in memory like AdminUserService — fine for this phase's small local dataset. */
    @Transactional(readOnly = true)
    public List<AdminCandidateSubscriptionSummary> adminListCandidateSubscriptions() {
        return userRepository.findAll().stream()
                .filter(user -> user.getRole() == UserRole.CANDIDATE)
                .map(user -> {
                    CandidateSubscription subscription =
                            subscriptionRepository.findByCandidateId(user.getId()).orElse(null);
                    SubscriptionPlan plan = subscription == null ? SubscriptionPlan.FREE : subscription.getPlan();
                    Instant validUntil = subscription == null ? null : subscription.getCurrentPeriodEnd();
                    return new AdminCandidateSubscriptionSummary(
                            user.getId(), user.getFullName(), user.getEmail(), plan, validUntil);
                })
                .toList();
    }

    /** Admin-only direct plan change (comps / support fixes) — deliberately bypasses the paid
     * Razorpay checkout the public path requires. Free and Plus only; granting Plus gets a fresh
     * PAID_PLAN_PERIOD so the daily expiry sweep treats it exactly like a purchased period, and a
     * ₹0 comp transaction is recorded for the audit trail. */
    @Transactional
    public AdminCandidateSubscriptionSummary adminSetPlan(UUID candidateId, SubscriptionPlan plan) {
        if (plan != SubscriptionPlan.FREE && plan != SubscriptionPlan.PLUS) {
            throw new PlanNotAdminAssignableException(plan);
        }
        User candidate = userRepository
                .findById(candidateId)
                .filter(user -> user.getRole() == UserRole.CANDIDATE)
                .orElseThrow(() -> new CandidateNotFoundException(candidateId));

        Instant currentPeriodEnd = plan == SubscriptionPlan.FREE ? null : Instant.now().plus(PAID_PLAN_PERIOD);
        CandidateSubscription subscription = subscriptionRepository
                .findByCandidateId(candidateId)
                .orElseGet(() -> new CandidateSubscription(candidateId, plan));
        subscription.changePlan(plan, currentPeriodEnd);
        subscriptionRepository.save(subscription);
        transactionRepository.save(BillingTransaction.adminGrant(candidateId, plan));

        return new AdminCandidateSubscriptionSummary(
                candidate.getId(), candidate.getFullName(), candidate.getEmail(), plan, currentPeriodEnd);
    }

    /** Deliberately allows checkout for a plan the candidate already holds — that's a renewal
     * (plans now expire after PAID_PLAN_PERIOD, see applyPaidTransaction), not a redundant
     * no-op, so it must go through the same paid flow as any other upgrade. */
    @Transactional
    public CheckoutSummary initiateCheckout(UUID candidateId, SubscriptionPlan plan) {
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

        BillingTransaction transaction = new BillingTransaction(candidateId, plan, razorpayOrderId);
        transactionRepository.save(transaction);

        return new CheckoutSummary(transaction.getId(), razorpayOrderId, razorpayKeyId, plan.getAmountRupees(), plan);
    }

    /** The client-side checkout callback — the fast confirmation path. handleWebhookEvent is the
     * fallback for when this never fires (browser closed before the callback ran). */
    @Transactional
    public CandidateBillingSummary verifyCheckout(
            UUID candidateId,
            UUID transactionId,
            String razorpayOrderId,
            String razorpayPaymentId,
            String razorpaySignature) {
        BillingTransaction transaction = transactionRepository
                .findById(transactionId)
                .filter(existing -> existing.getCandidateId().equals(candidateId))
                .orElseThrow(() -> new BillingTransactionNotFoundException(transactionId));

        if (transaction.getStatus() != TransactionStatus.PENDING) {
            // Already settled — most likely the webhook got there first. Same end state either
            // way, so just report the current plan rather than erroring.
            return summaryFor(candidateId);
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
        return summaryFor(candidateId);
    }

    /** Only PAID transactions have a real invoice — same 404-for-not-found-and-not-owned pattern
     * as verifyCheckout also covers "exists but never completed payment" by reusing the same
     * not-found exception, since the frontend only ever links this for PAID history rows. */
    @Transactional(readOnly = true)
    public byte[] generateInvoice(UUID candidateId, UUID transactionId) {
        BillingTransaction transaction = transactionRepository
                .findById(transactionId)
                .filter(existing -> existing.getCandidateId().equals(candidateId))
                .filter(existing -> existing.getStatus() == TransactionStatus.PAID)
                .orElseThrow(() -> new BillingTransactionNotFoundException(transactionId));
        User candidate = userRepository
                .findById(candidateId)
                .orElseThrow(() -> new BillingTransactionNotFoundException(transactionId));

        return InvoicePdfGenerator.generate(transaction, candidate);
    }

    /** Server-to-server fallback for verifyCheckout — always verify-then-ignore rather than
     * throwing, since Razorpay retries on any non-2xx response and an unrecognized/unverifiable
     * event isn't actionable here anyway (see RazorpayWebhookController, which always returns
     * 200). */
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

    private void applyPaidTransaction(BillingTransaction transaction, String razorpayPaymentId) {
        transaction.markPaid(razorpayPaymentId);
        transactionRepository.save(transaction);

        CandidateSubscription subscription = subscriptionRepository
                .findByCandidateId(transaction.getCandidateId())
                .orElseGet(() -> new CandidateSubscription(transaction.getCandidateId(), transaction.getPlan()));

        Instant now = Instant.now();
        Instant currentPeriodEnd = subscription.getCurrentPeriodEnd();
        // Renewing before the current period lapses stacks the new period on top of the
        // remaining days; renewing after it's lapsed (or never had one) just starts fresh.
        Instant renewalBase = currentPeriodEnd != null && currentPeriodEnd.isAfter(now) ? currentPeriodEnd : now;
        subscription.changePlan(transaction.getPlan(), renewalBase.plus(PAID_PLAN_PERIOD));
        subscriptionRepository.save(subscription);
    }

    /** Daily sweep for paid plans whose period has lapsed with no renewal — downgrades them to
     * Free and records the same kind of ₹0 "settled" BillingTransaction a manual Free downgrade
     * produces, so it reads identically in billing history. */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void expireOverdueSubscriptions() {
        Instant now = Instant.now();
        List<CandidateSubscription> overdue =
                subscriptionRepository.findByCurrentPeriodEndBeforeAndPlanNot(now, SubscriptionPlan.FREE);
        for (CandidateSubscription subscription : overdue) {
            subscription.changePlan(SubscriptionPlan.FREE, null);
            subscriptionRepository.save(subscription);
            transactionRepository.save(new BillingTransaction(subscription.getCandidateId(), SubscriptionPlan.FREE));
        }
    }

    private SubscriptionPlan currentPlan(UUID candidateId) {
        return subscriptionRepository
                .findByCandidateId(candidateId)
                .map(CandidateSubscription::getPlan)
                .orElse(SubscriptionPlan.FREE);
    }

    private CandidateBillingSummary summaryFor(UUID candidateId) {
        CandidateSubscription subscription = subscriptionRepository.findByCandidateId(candidateId).orElse(null);
        SubscriptionPlan plan = subscription == null ? SubscriptionPlan.FREE : subscription.getPlan();
        Instant validUntil = subscription == null ? null : subscription.getCurrentPeriodEnd();
        return new CandidateBillingSummary(plan, validUntil, getHistory(candidateId));
    }

    private List<BillingTransactionSummary> getHistory(UUID candidateId) {
        return transactionRepository.findByCandidateIdOrderByCreatedAtDesc(candidateId).stream()
                .map(this::toSummary)
                .toList();
    }

    private BillingTransactionSummary toSummary(BillingTransaction transaction) {
        return new BillingTransactionSummary(
                transaction.getId(),
                transaction.getPlan(),
                transaction.getAmountRupees(),
                transaction.getStatus(),
                transaction.getCreatedAt());
    }
}
