package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reports")
public class AdminReportsController {

    private final AdminReportsService adminReportsService;

    public AdminReportsController(AdminReportsService adminReportsService) {
        this.adminReportsService = adminReportsService;
    }

    @GetMapping("/candidates")
    public AdminCandidateReportStats candidates() {
        return adminReportsService.getCandidateStats();
    }
}
