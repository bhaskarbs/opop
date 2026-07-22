package com.openopportunity.settings;

import com.openopportunity.settings.dto.PlatformSettingsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Backs the admin console's live feature toggles (see AdminSettingsController) — read on every
 * request that needs it (AuthService.register, EmailVerificationFilter) rather than cached, so a
 * toggle takes effect immediately for every subsequent request without a restart. */
@Service
public class PlatformSettingsService {

    static final short SETTINGS_ID = 1;

    private final PlatformSettingsRepository platformSettingsRepository;

    public PlatformSettingsService(PlatformSettingsRepository platformSettingsRepository) {
        this.platformSettingsRepository = platformSettingsRepository;
    }

    @Transactional(readOnly = true)
    public boolean isEmailVerificationEnabled() {
        return platformSettingsRepository
                .findById(SETTINGS_ID)
                .map(PlatformSettings::isEmailVerificationEnabled)
                .orElse(true);
    }

    @Transactional(readOnly = true)
    public PlatformSettingsResponse get() {
        return new PlatformSettingsResponse(isEmailVerificationEnabled());
    }

    @Transactional
    public PlatformSettingsResponse setEmailVerificationEnabled(boolean enabled) {
        PlatformSettings settings = platformSettingsRepository
                .findById(SETTINGS_ID)
                .orElseGet(() -> new PlatformSettings(SETTINGS_ID, true));
        settings.setEmailVerificationEnabled(enabled);
        platformSettingsRepository.save(settings);
        return new PlatformSettingsResponse(settings.isEmailVerificationEnabled());
    }
}
