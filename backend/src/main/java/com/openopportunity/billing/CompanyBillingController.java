package com.openopportunity.billing;

import com.openopportunity.billing.dto.CompanyBillingSummary;
import com.openopportunity.billing.dto.CompanyChangePlanRequest;
import com.openopportunity.billing.dto.CompanyCheckoutSummary;
import com.openopportunity.billing.dto.CompanyInitiateCheckoutRequest;
import com.openopportunity.billing.dto.CompanyVerifyCheckoutRequest;
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
@RequestMapping("/api/company/billing")
public class CompanyBillingController {

    private final CompanyBillingService companyBillingService;

    public CompanyBillingController(CompanyBillingService companyBillingService) {
        this.companyBillingService = companyBillingService;
    }

    @GetMapping
    public CompanyBillingSummary get() {
        return companyBillingService.getBilling(currentUserId());
    }

    /** Downgrade-to-Free only — see CompanyBillingService.changePlan. */
    @PostMapping("/plan")
    public CompanyBillingSummary changePlan(@Valid @RequestBody CompanyChangePlanRequest request) {
        return companyBillingService.changePlan(currentUserId(), request.plan());
    }

    @PostMapping("/checkout")
    public CompanyCheckoutSummary checkout(@Valid @RequestBody CompanyInitiateCheckoutRequest request) {
        return companyBillingService.initiateCheckout(currentUserId(), request.plan());
    }

    @PostMapping("/checkout/verify")
    public CompanyBillingSummary verifyCheckout(@Valid @RequestBody CompanyVerifyCheckoutRequest request) {
        return companyBillingService.verifyCheckout(
                currentUserId(),
                request.transactionId(),
                request.razorpayOrderId(),
                request.razorpayPaymentId(),
                request.razorpaySignature());
    }

    @GetMapping("/transactions/{transactionId}/invoice")
    public ResponseEntity<ByteArrayResource> invoice(@PathVariable UUID transactionId) {
        byte[] pdf = companyBillingService.generateInvoice(currentUserId(), transactionId);
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
