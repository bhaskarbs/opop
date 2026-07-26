package com.openopportunity.billing;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public (see SecurityConfig's permitAll list) — Razorpay calls this server-to-server with no
 * JWT, so auth here is the HMAC signature check inside each service's handleWebhookEvent, not
 * Spring Security. Always returns 200 regardless of outcome: Razorpay retries on any non-2xx
 * response, and an unverifiable or uninteresting event isn't actionable here anyway.
 *
 * <p>One shared endpoint for both candidate and company checkouts — each service looks up the
 * order id in its own transactions table and silently no-ops if it's not there, so it's safe
 * (if slightly redundant, one extra HMAC check) to just call both on every event rather than
 * needing to know upfront which side a given order belongs to. */
@RestController
@RequestMapping("/api/webhooks")
public class RazorpayWebhookController {

    private final CandidateBillingService candidateBillingService;
    private final CompanyBillingService companyBillingService;

    public RazorpayWebhookController(
            CandidateBillingService candidateBillingService, CompanyBillingService companyBillingService) {
        this.candidateBillingService = candidateBillingService;
        this.companyBillingService = companyBillingService;
    }

    @PostMapping("/razorpay")
    public ResponseEntity<Void> razorpay(
            HttpServletRequest request,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature)
            throws IOException {
        // Read the raw bytes ourselves rather than binding @RequestBody String — the signature is
        // computed over the exact request body, and going through Spring's message-converter
        // content-type negotiation risks that not matching byte-for-byte.
        String rawPayload = new String(request.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        candidateBillingService.handleWebhookEvent(rawPayload, signature);
        companyBillingService.handleWebhookEvent(rawPayload, signature);
        return ResponseEntity.ok().build();
    }
}
