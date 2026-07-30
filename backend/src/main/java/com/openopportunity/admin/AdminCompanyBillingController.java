package com.openopportunity.admin;

import com.openopportunity.billing.CompanyBillingService;
import com.openopportunity.billing.dto.AdminCompanySubscriptionSummary;
import com.openopportunity.billing.dto.CompanyChangePlanRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only view and control over company subscriptions. Mirrors
 * AdminCandidateBillingController exactly. Secured by the blanket "/api/admin/** → ADMIN" rule
 * in SecurityConfig, so no method-level checks are needed here. */
@RestController
@RequestMapping("/api/admin/company-billing")
public class AdminCompanyBillingController {

    private final CompanyBillingService companyBillingService;

    public AdminCompanyBillingController(CompanyBillingService companyBillingService) {
        this.companyBillingService = companyBillingService;
    }

    @GetMapping
    public List<AdminCompanySubscriptionSummary> list() {
        return companyBillingService.adminListCompanySubscriptions();
    }

    @PostMapping("/{companyId}/plan")
    public AdminCompanySubscriptionSummary setPlan(
            @PathVariable UUID companyId, @Valid @RequestBody CompanyChangePlanRequest request) {
        return companyBillingService.adminSetPlan(companyId, request.plan());
    }
}
