package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminBillingStats;
import com.openopportunity.admin.dto.AdminInvoiceSummary;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/billing")
public class AdminBillingController {

    private final AdminBillingService adminBillingService;

    public AdminBillingController(AdminBillingService adminBillingService) {
        this.adminBillingService = adminBillingService;
    }

    @GetMapping("/stats")
    public AdminBillingStats stats() {
        return adminBillingService.getStats();
    }

    @GetMapping("/invoices")
    public List<AdminInvoiceSummary> invoices() {
        return adminBillingService.getInvoiceHistory();
    }
}
