package com.openopportunity.billing;

public enum CompanySubscriptionPlan {
    FREE(0, 0),
    GROWTH(399, 50),
    ENTERPRISE(899, 250);

    private final int amountRupees;
    // How many distinct candidate contacts this plan allows revealing per billing period (see
    // CandidateSearchService.getContactQuota) — Free allows none at all.
    private final int contactQuota;

    CompanySubscriptionPlan(int amountRupees, int contactQuota) {
        this.amountRupees = amountRupees;
        this.contactQuota = contactQuota;
    }

    public int getAmountRupees() {
        return amountRupees;
    }

    public int getContactQuota() {
        return contactQuota;
    }
}
