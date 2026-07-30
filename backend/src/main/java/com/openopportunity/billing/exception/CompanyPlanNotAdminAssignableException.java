package com.openopportunity.billing.exception;

import com.openopportunity.billing.CompanySubscriptionPlan;

public class CompanyPlanNotAdminAssignableException extends RuntimeException {

    public CompanyPlanNotAdminAssignableException(CompanySubscriptionPlan plan) {
        super("An admin can only assign the Free or Growth plan, not " + plan);
    }
}
