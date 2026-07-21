package com.openopportunity.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One record per plan-change attempt — both the audit trail and the "billing history" list
 * shown on CandidateBillingPage.tsx. A Free downgrade is created already PAID (no money involved,
 * see the no-arg-order constructor); a paid-plan checkout is created PENDING against a real
 * Razorpay Order and only becomes PAID once CandidateBillingService verifies the payment (either
 * via the client-side checkout callback or the webhook fallback — see markPaid/markFailed). */
@Entity
@Table(name = "candidate_billing_transactions")
public class BillingTransaction {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, updatable = false)
    private UUID candidateId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private SubscriptionPlan plan;

    @Column(name = "amount_rupees", nullable = false, updatable = false)
    private int amountRupees;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @Column(name = "razorpay_order_id", length = 64, updatable = false)
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id", length = 64)
    private String razorpayPaymentId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BillingTransaction() {
        // JPA
    }

    /** Free downgrade — no payment involved, recorded as already settled. */
    public BillingTransaction(UUID candidateId, SubscriptionPlan plan) {
        this(candidateId, plan, null);
        this.status = TransactionStatus.PAID;
    }

    /** Admin comp grant — no money changes hands, so it's recorded as a settled ₹0 transaction
     * (rather than the plan's real price) purely for the audit trail / billing history. */
    public static BillingTransaction adminGrant(UUID candidateId, SubscriptionPlan plan) {
        BillingTransaction transaction = new BillingTransaction(candidateId, plan, null);
        transaction.amountRupees = 0;
        transaction.status = TransactionStatus.PAID;
        return transaction;
    }

    /** Paid-plan checkout — starts PENDING against a just-created Razorpay Order. */
    public BillingTransaction(UUID candidateId, SubscriptionPlan plan, String razorpayOrderId) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.plan = plan;
        this.amountRupees = plan.getAmountRupees();
        this.status = TransactionStatus.PENDING;
        this.razorpayOrderId = razorpayOrderId;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public void markPaid(String razorpayPaymentId) {
        this.status = TransactionStatus.PAID;
        this.razorpayPaymentId = razorpayPaymentId;
    }

    public void markFailed() {
        this.status = TransactionStatus.FAILED;
    }

    public UUID getId() {
        return id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public SubscriptionPlan getPlan() {
        return plan;
    }

    public int getAmountRupees() {
        return amountRupees;
    }

    public TransactionStatus getStatus() {
        return status;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public String getRazorpayPaymentId() {
        return razorpayPaymentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
