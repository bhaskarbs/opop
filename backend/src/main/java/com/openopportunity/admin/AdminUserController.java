package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminUserSummary;
import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.UserRole;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserService adminUserService;

    public AdminUserController(AdminUserService adminUserService) {
        this.adminUserService = adminUserService;
    }

    @GetMapping
    public List<AdminUserSummary> list(
            @RequestParam(required = false) UserRole role,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String q) {
        return adminUserService.list(role, status, q);
    }

    @PostMapping("/{id}/suspend")
    public AdminUserSummary suspend(@PathVariable UUID id) {
        return adminUserService.suspend(id);
    }

    @PostMapping("/{id}/reactivate")
    public AdminUserSummary reactivate(@PathVariable UUID id) {
        return adminUserService.reactivate(id);
    }
}
