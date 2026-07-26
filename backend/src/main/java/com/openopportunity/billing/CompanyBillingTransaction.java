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
 * shown on CompanyBillingPage.tsx. Mirrors BillingTransaction (candidate) exactly, kept as its
 * own table rather than shared since company_id and candidate_id aren't the same domain
 * concept even though both ultimately reference users(id). */
@Entity
@Table(name = "company_billing_transactions")
public class CompanyBillingTransaction {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private UUID companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, updatable = false)
    private CompanySubscriptionPlan plan;

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

    protected CompanyBillingTransaction() {
        // JPA
    }

    /** Free downgrade — no payment involved, recorded as already settled. */
    public CompanyBillingTransaction(UUID companyId, CompanySubscriptionPlan plan) {
        this(companyId, plan, null);
        this.status = TransactionStatus.PAID;
    }

    /** Paid-plan checkout — starts PENDING against a just-created Razorpay Order. */
    public CompanyBillingTransaction(UUID companyId, CompanySubscriptionPlan plan, String razorpayOrderId) {
        this.id = UUID.randomUUID();
        this.companyId = companyId;
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

    public UUID getCompanyId() {
        return companyId;
    }

    public CompanySubscriptionPlan getPlan() {
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
