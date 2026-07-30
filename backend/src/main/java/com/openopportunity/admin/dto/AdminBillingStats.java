package com.openopportunity.admin.dto;

/** Combined candidate + company billing snapshot for the admin billing page (see
 * AdminBillingService). monthlyRecurringRevenueRupees sums the plan price of every currently
 * active (non-Free, not-yet-expired) subscription — a proxy for MRR, since this app doesn't
 * track a true recurring-billing ledger. churnedThisMonth counts FREE-plan transactions
 * (self-service downgrade, admin comp, or the daily expiry sweep) recorded since the start of
 * the current calendar month. */
public record AdminBillingStats(long monthlyRecurringRevenueRupees, long activeSubscriptions, long churnedThisMonth) {}
