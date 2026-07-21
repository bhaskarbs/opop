package com.openopportunity.billing;

import com.openopportunity.billing.dto.CandidateBillingSummary;
import com.openopportunity.billing.dto.ChangePlanRequest;
import com.openopportunity.billing.dto.CheckoutSummary;
import com.openopportunity.billing.dto.InitiateCheckoutRequest;
import com.openopportunity.billing.dto.VerifyCheckoutRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

    /** Downgrade-to-Free only now — see CandidateBillingService.changePlan. */
    @PostMapping("/plan")
    public CandidateBillingSummary changePlan(@Valid @RequestBody ChangePlanRequest request) {
        return candidateBillingService.changePlan(currentUserId(), request.plan());
    }

    @PostMapping("/checkout")
    public CheckoutSummary checkout(@Valid @RequestBody InitiateCheckoutRequest request) {
        return candidateBillingService.initiateCheckout(currentUserId(), request.plan());
    }

    @PostMapping("/checkout/verify")
    public CandidateBillingSummary verifyCheckout(@Valid @RequestBody VerifyCheckoutRequest request) {
        return candidateBillingService.verifyCheckout(
                currentUserId(),
                request.transactionId(),
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature());
    }

    @GetMapping("/transactions/{transactionId}/invoice")
    public ResponseEntity<ByteArrayResource> invoice(@PathVariable UUID transactionId) {
        byte[] pdf = candidateBillingService.generateInvoice(currentUserId(), transactionId);
        String filename = "invoice-" + transactionId.toString().substring(0, 8) + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(new ByteArrayResource(pdf));
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
