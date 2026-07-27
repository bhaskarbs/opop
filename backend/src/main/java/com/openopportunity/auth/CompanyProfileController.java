package com.openopportunity.auth;

import com.openopportunity.auth.dto.CertificateUploadResponse;
import com.openopportunity.auth.dto.CompanyProfileResponse;
import com.openopportunity.auth.dto.LogoUploadResponse;
import com.openopportunity.auth.dto.UpdateCompanyProfileRequest;
import jakarta.validation.Valid;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/company")
public class CompanyProfileController {

    private final CompanyProfileService companyProfileService;

    public CompanyProfileController(CompanyProfileService companyProfileService) {
        this.companyProfileService = companyProfileService;
    }

    @GetMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> getProfile() {
        return ResponseEntity.ok(companyProfileService.getProfile(currentUserId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> updateProfile(@Valid @RequestBody UpdateCompanyProfileRequest request) {
        return ResponseEntity.ok(companyProfileService.updateProfile(currentUserId(), request));
    }

    @PostMapping("/logo")
    public ResponseEntity<LogoUploadResponse> uploadLogo(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(companyProfileService.uploadLogo(currentUserId(), file));
    }

    @PostMapping("/certificate")
    public ResponseEntity<CertificateUploadResponse> uploadCertificate(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(companyProfileService.uploadCertificate(currentUserId(), file));
    }

    @GetMapping("/certificate")
    public ResponseEntity<Resource> getCertificate() {
        CompanyProfileService.CompanyCertificateContent certificate =
                companyProfileService.getCertificate(currentUserId());
        String encodedFileName =
                URLEncoder.encode(certificate.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(certificate.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFileName)
                .body(certificate.resource());
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
