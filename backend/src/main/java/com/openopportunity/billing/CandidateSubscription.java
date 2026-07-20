package com.openopportunity.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A candidate's current plan — one row per candidate, created lazily on their first plan
 * change (see CandidateBillingService); no row means FREE. There's no real payment gateway in
 * this phase, so changing plan here is the entire "upgrade/downgrade" flow. */
@Entity
@Table(name = "candidate_subscriptions")
public class CandidateSubscription {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "candidate_id", nullable = false, unique = true, updatable = false)
    private UUID candidateId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubscriptionPlan plan;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CandidateSubscription() {
        // JPA
    }

    public CandidateSubscription(UUID candidateId, SubscriptionPlan plan) {
        this.id = UUID.randomUUID();
        this.candidateId = candidateId;
        this.plan = plan;
        this.updatedAt = Instant.now();
    }

    public void changePlan(SubscriptionPlan plan) {
        this.plan = plan;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
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

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
