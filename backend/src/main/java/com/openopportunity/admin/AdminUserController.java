package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminCandidateProfileSummary;
import com.openopportunity.admin.dto.AdminUserSummary;
import com.openopportunity.auth.AccountStatus;
import com.openopportunity.auth.UserRole;
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

    @GetMapping("/candidates/{id}")
    public AdminCandidateProfileSummary candidateDetail(@PathVariable UUID id) {
        return adminUserService.getCandidateDetail(id);
    }

    @GetMapping("/candidates/{id}/resume")
    public ResponseEntity<Resource> candidateResume(@PathVariable UUID id) {
        AdminUserService.LoadedResume resume = adminUserService.getCandidateResume(id);
        String encodedFileName =
                URLEncoder.encode(resume.fileName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(resume.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encodedFileName)
                .body(resume.resource());
    }

    @PostMapping("/{id}/suspend")
    public AdminUserSummary suspend(@PathVariable UUID id) {
        return adminUserService.suspend(id);
    }

    @PostMapping("/{id}/reactivate")
    public AdminUserSummary reactivate(@PathVariable UUID id) {
        return adminUserService.reactivate(id);
    }

    @PostMapping("/candidates/{id}/feature")
    public AdminUserSummary feature(@PathVariable UUID id) {
        return adminUserService.feature(id);
    }

    @PostMapping("/candidates/{id}/unfeature")
    public AdminUserSummary unfeature(@PathVariable UUID id) {
        return adminUserService.unfeature(id);
    }
}
