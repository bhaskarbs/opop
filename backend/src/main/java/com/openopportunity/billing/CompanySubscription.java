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

/** A company's current plan — one row per company, created lazily on their first plan change
 * (see CompanyBillingService); no row means FREE. Mirrors CandidateSubscription exactly, one
 * per role rather than a shared table (same precedent as CompanyProfile vs CandidateProfile). */
@Entity
@Table(name = "company_subscriptions")
public class CompanySubscription {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false, unique = true, updatable = false)
    private UUID companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompanySubscriptionPlan plan;

    // Null for Free (or a company who's never subscribed) — no active paid period. Set to
    // ~30 days out on every successful paid checkout; a lapsed row here is what
    // CompanyBillingService.expireOverdueSubscriptions sweeps back to Free.
    @Column(name = "current_period_end")
    private Instant currentPeriodEnd;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected CompanySubscription() {
        // JPA
    }

    public CompanySubscription(UUID companyId, CompanySubscriptionPlan plan) {
        this.id = UUID.randomUUID();
        this.companyId = companyId;
        this.plan = plan;
        this.updatedAt = Instant.now();
    }

    public void changePlan(CompanySubscriptionPlan plan, Instant currentPeriodEnd) {
        this.plan = plan;
        this.currentPeriodEnd = currentPeriodEnd;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
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

    public Instant getCurrentPeriodEnd() {
        return currentPeriodEnd;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
