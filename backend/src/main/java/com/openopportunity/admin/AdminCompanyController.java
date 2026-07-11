package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCompanyProfileSummary;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/companies")
public class AdminCompanyController {

    private final AdminCompanyService adminCompanyService;

    public AdminCompanyController(AdminCompanyService adminCompanyService) {
        this.adminCompanyService = adminCompanyService;
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
}
