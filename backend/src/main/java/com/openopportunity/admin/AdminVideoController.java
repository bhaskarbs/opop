package com.openopportunity.admin;

import com.openopportunity.sharedvideo.AdminVideoService;
import com.openopportunity.sharedvideo.dto.AdminSharedVideoSummary;
import com.openopportunity.sharedvideo.dto.AdminVideoShareSummary;
import com.openopportunity.sharedvideo.dto.CreateVideoShareRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/videos")
public class AdminVideoController {

    private final AdminVideoService adminVideoService;

    public AdminVideoController(AdminVideoService adminVideoService) {
        this.adminVideoService = adminVideoService;
    }

    @GetMapping
    public ResponseEntity<List<AdminSharedVideoSummary>> list() {
        return ResponseEntity.ok(adminVideoService.list());
    }

    @PostMapping
    public ResponseEntity<AdminSharedVideoSummary> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "durationSeconds", required = false) Integer durationSeconds) {
        return ResponseEntity.ok(adminVideoService.upload(currentUserId(), file, title, durationSeconds));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        adminVideoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/shares")
    public ResponseEntity<AdminVideoShareSummary> createShare(
            @PathVariable UUID id, @Valid @RequestBody CreateVideoShareRequest request) {
        return ResponseEntity.ok(adminVideoService.createShare(id, request));
    }

    @GetMapping("/{id}/shares")
    public ResponseEntity<List<AdminVideoShareSummary>> listShares(@PathVariable UUID id) {
        return ResponseEntity.ok(adminVideoService.listShares(id));
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
