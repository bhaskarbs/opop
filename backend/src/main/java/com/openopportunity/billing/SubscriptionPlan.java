package com.openopportunity.billing;

public enum SubscriptionPlan {
    FREE(0),
    PLUS(249),
    PRO(1499);

    private final int amountRupees;

    SubscriptionPlan(int amountRupees) {
        this.amountRupees = amountRupees;
    }

    public int getAmountRupees() {
        return amountRupees;
    }
}
