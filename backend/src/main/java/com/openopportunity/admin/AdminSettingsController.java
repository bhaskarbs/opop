package com.openopportunity.admin;

import com.openopportunity.settings.PlatformSettingsService;
import com.openopportunity.settings.dto.PlatformSettingsResponse;
import com.openopportunity.settings.dto.UpdateEmailVerificationSettingRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only platform feature toggles. Secured by the blanket "/api/admin/** → ADMIN" rule in
 * SecurityConfig, so no method-level checks are needed here. */
@RestController
@RequestMapping("/api/admin/settings")
public class AdminSettingsController {

    private final PlatformSettingsService platformSettingsService;

    public AdminSettingsController(PlatformSettingsService platformSettingsService) {
        this.platformSettingsService = platformSettingsService;
    }

    @GetMapping
    public PlatformSettingsResponse get() {
        return platformSettingsService.get();
    }

    @PutMapping("/email-verification")
    public PlatformSettingsResponse setEmailVerification(
            @Valid @RequestBody UpdateEmailVerificationSettingRequest request) {
        return platformSettingsService.setEmailVerificationEnabled(request.emailVerificationEnabled());
    }
}
