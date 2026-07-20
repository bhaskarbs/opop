package com.openopportunity.billing;

import com.openopportunity.billing.dto.CandidateBillingSummary;
import com.openopportunity.billing.dto.ChangePlanRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/candidate/billing")
public class CandidateBillingController {

    private final CandidateBillingService candidateBillingService;

    public CandidateBillingController(CandidateBillingService candidateBillingService) {
        this.candidateBillingService = candidateBillingService;
    }

    @GetMapping
    public CandidateBillingSummary get() {
        return candidateBillingService.getBilling(currentUserId());
    }

    @PostMapping("/plan")
    public CandidateBillingSummary changePlan(@Valid @RequestBody ChangePlanRequest request) {
        return candidateBillingService.changePlan(currentUserId(), request.plan());
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
