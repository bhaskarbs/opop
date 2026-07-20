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

/** One record per plan change, recorded as an immediately-successful mock payment (no real
 * payment gateway exists in this phase) — this is what CandidateBillingPage.tsx's billing
 * history list actually shows. */
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
    @Column(nullable = false, length = 20, updatable = false)
    private TransactionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected BillingTransaction() {
        // JPA
    }

    public BillingTransaction(UUID candidateId, SubscriptionPlan plan) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.plan = plan;
        this.amountRupees = plan.getAmountRupees();
        this.status = TransactionStatus.PAID;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
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

    public Instant getCreatedAt() {
        return createdAt;
    }
}
