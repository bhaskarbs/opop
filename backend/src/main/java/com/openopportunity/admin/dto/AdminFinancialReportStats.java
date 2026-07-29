package com.openopportunity.admin.dto;

/** All-time PAID revenue (see AdminReportsService.getFinancialStats) — there's no payment gate
 * on job postings or featured listings anywhere in the schema, so those aren't real revenue
 * sources here; candidateSubscriptionRevenueRupees + companySubscriptionRevenueRupees always
 * equals totalRevenueRupees. */
public record AdminFinancialReportStats(
        long totalRevenueRupees,
        long candidateSubscriptionRevenueRupees,
        long companySubscriptionRevenueRupees) {}
