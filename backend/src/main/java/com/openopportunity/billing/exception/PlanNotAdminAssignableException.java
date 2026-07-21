package com.openopportunity.billing.exception;

import com.openopportunity.billing.SubscriptionPlan;

public class PlanNotAdminAssignableException extends RuntimeException {

    public PlanNotAdminAssignableException(SubscriptionPlan plan) {
        super("An admin can only assign the Free or Plus plan, not " + plan);
    }
}
