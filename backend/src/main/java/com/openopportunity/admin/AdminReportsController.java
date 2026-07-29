package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateReportStats;
import com.openopportunity.admin.dto.AdminCommunityInterestSummary;
import com.openopportunity.admin.dto.AdminFinancialReportStats;
import com.openopportunity.admin.dto.AdminPartnershipReportStats;
import java.util.List;
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

    @GetMapping("/partnerships")
    public AdminPartnershipReportStats partnerships() {
        return adminReportsService.getPartnershipStats();
    }

    @GetMapping("/community")
    public List<AdminCommunityInterestSummary> community() {
        return adminReportsService.getCommunityInterestSubmissions();
    }

    @GetMapping("/financial")
    public AdminFinancialReportStats financial() {
        return adminReportsService.getFinancialStats();
    }
}
