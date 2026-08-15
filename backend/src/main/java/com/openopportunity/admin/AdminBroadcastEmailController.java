package com.openopportunity.admin;

import com.openopportunity.admin.dto.BroadcastEmailResult;
import com.openopportunity.admin.dto.SendBroadcastEmailRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/broadcast-email")
public class AdminBroadcastEmailController {

    private final AdminBroadcastEmailService adminBroadcastEmailService;

    public AdminBroadcastEmailController(AdminBroadcastEmailService adminBroadcastEmailService) {
        this.adminBroadcastEmailService = adminBroadcastEmailService;
    }

    @PostMapping
    public ResponseEntity<BroadcastEmailResult> send(@Valid @RequestBody SendBroadcastEmailRequest request) {
        return ResponseEntity.ok(adminBroadcastEmailService.send(request));
    }
}
