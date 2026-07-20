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
 * JWT, so auth here is the HMAC signature check inside CandidateBillingService.handleWebhookEvent,
 * not Spring Security. Always returns 200 regardless of outcome: Razorpay retries on any non-2xx
 * response, and an unverifiable or uninteresting event isn't actionable here anyway. */
@RestController
@RequestMapping("/api/webhooks")
public class RazorpayWebhookController {

    private final CandidateBillingService candidateBillingService;

    public RazorpayWebhookController(CandidateBillingService candidateBillingService) {
        this.candidateBillingService = candidateBillingService;
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
        return ResponseEntity.ok().build();
    }
}
