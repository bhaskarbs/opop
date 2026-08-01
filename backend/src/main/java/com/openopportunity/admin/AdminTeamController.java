package com.openopportunity.admin;

import com.openopportunity.admin.dto.AdminTeamMemberSummary;
import com.openopportunity.admin.dto.CreateAdminTeamMemberRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** GET is reachable by any admin-tier account; POST/DELETE are restricted to SUPER_ADMIN at the
 * URL level (see SecurityConfig) — AdminTeamService also re-checks, so this stays safe even if
 * that URL rule is ever loosened by mistake. */
@RestController
@RequestMapping("/api/admin/team")
public class AdminTeamController {

    private final AdminTeamService adminTeamService;

    public AdminTeamController(AdminTeamService adminTeamService) {
        this.adminTeamService = adminTeamService;
    }

    @GetMapping
    public List<AdminTeamMemberSummary> list() {
        return adminTeamService.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminTeamMemberSummary create(@Valid @RequestBody CreateAdminTeamMemberRequest request) {
        return adminTeamService.create(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        adminTeamService.delete(id, currentUserId());
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
