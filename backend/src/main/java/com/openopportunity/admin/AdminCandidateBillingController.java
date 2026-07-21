package com.openopportunity.admin;

import com.openopportunity.billing.CandidateBillingService;
import com.openopportunity.billing.dto.AdminCandidateSubscriptionSummary;
import com.openopportunity.billing.dto.ChangePlanRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only view and control over candidate subscriptions. Secured by the blanket
 * "/api/admin/** → ADMIN" rule in SecurityConfig, so no method-level checks are needed here. */
@RestController
@RequestMapping("/api/admin/candidate-billing")
public class AdminCandidateBillingController {

    private final CandidateBillingService candidateBillingService;

    public AdminCandidateBillingController(CandidateBillingService candidateBillingService) {
        this.candidateBillingService = candidateBillingService;
    }

    @GetMapping
    public List<AdminCandidateSubscriptionSummary> list() {
        return candidateBillingService.adminListCandidateSubscriptions();
    }

    @PostMapping("/{candidateId}/plan")
    public AdminCandidateSubscriptionSummary setPlan(
            @PathVariable UUID candidateId, @Valid @RequestBody ChangePlanRequest request) {
        return candidateBillingService.adminSetPlan(candidateId, request.plan());
    }
}
