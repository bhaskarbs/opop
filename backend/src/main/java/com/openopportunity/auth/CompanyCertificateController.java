package com.openopportunity.auth;

import com.openopportunity.auth.dto.CompanyCertificateSummary;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/company/certificates")
public class CompanyCertificateController {

    private final CompanyCertificateService companyCertificateService;

    public CompanyCertificateController(CompanyCertificateService companyCertificateService) {
        this.companyCertificateService = companyCertificateService;
    }

    @GetMapping
    public ResponseEntity<List<CompanyCertificateSummary>> list() {
        return ResponseEntity.ok(companyCertificateService.list(currentUserId()));
    }

    @PostMapping
    public ResponseEntity<CompanyCertificateSummary> upload(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(companyCertificateService.upload(currentUserId(), file));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        CompanyCertificateService.CompanyCertificateContent certificate =
                companyCertificateService.download(currentUserId(), id);
        String encodedFileName =
                URLEncoder.encode(certificate.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(certificate.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFileName)
                .body(certificate.resource());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        companyCertificateService.delete(currentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
