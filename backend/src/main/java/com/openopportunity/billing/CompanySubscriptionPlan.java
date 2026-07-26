package com.openopportunity.billing;

public enum CompanySubscriptionPlan {
    FREE(0),
    GROWTH(399),
    ENTERPRISE(899);

    private final int amountRupees;

    CompanySubscriptionPlan(int amountRupees) {
        this.amountRupees = amountRupees;
    }

    public int getAmountRupees() {
        return amountRupees;
    }
}
