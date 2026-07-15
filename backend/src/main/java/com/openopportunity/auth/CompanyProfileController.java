package com.openopportunity.auth;

import com.openopportunity.auth.dto.CompanyProfileResponse;
import com.openopportunity.auth.dto.UpdateCompanyProfileRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
