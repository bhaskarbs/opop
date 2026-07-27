package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCompanyProfileSummary;
import com.openopportunity.auth.CompanyCertificateService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/companies")
public class AdminCompanyController {

    private final AdminCompanyService adminCompanyService;
    private final CompanyCertificateService companyCertificateService;

    public AdminCompanyController(
            AdminCompanyService adminCompanyService, CompanyCertificateService companyCertificateService) {
        this.adminCompanyService = adminCompanyService;
        this.companyCertificateService = companyCertificateService;
    }

    @GetMapping("/pending")
    public List<AdminCompanyProfileSummary> pending() {
        return adminCompanyService.getPending();
    }

    @PostMapping("/{userId}/verify")
    public AdminCompanyProfileSummary verify(@PathVariable UUID userId) {
        return adminCompanyService.verify(userId);
    }

    @PostMapping("/{userId}/reject")
    public AdminCompanyProfileSummary reject(@PathVariable UUID userId) {
        return adminCompanyService.reject(userId);
    }

    /** Lets an admin download a document a company uploaded for verification (see
     * CompanyCertificateService, which the company's own self-service endpoints also use). */
    @GetMapping("/{userId}/certificates/{certificateId}")
    public ResponseEntity<Resource> downloadCertificate(
            @PathVariable UUID userId, @PathVariable UUID certificateId) {
        CompanyCertificateService.CompanyCertificateContent certificate =
                companyCertificateService.download(userId, certificateId);
        String encodedFileName =
                URLEncoder.encode(certificate.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(certificate.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFileName)
                .body(certificate.resource());
    }
}
