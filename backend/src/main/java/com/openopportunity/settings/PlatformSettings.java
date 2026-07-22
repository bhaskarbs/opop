package com.openopportunity.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A single-row table (id is always {@link PlatformSettingsService#SETTINGS_ID}) rather than a
 * generic key/value store — there's exactly one toggle to hold today, and a real second one is
 * just another column away if it comes up. */
@Entity
@Table(name = "platform_settings")
public class PlatformSettings {

    @Id
    private short id;

    @Column(name = "email_verification_enabled", nullable = false)
    private boolean emailVerificationEnabled;

    protected PlatformSettings() {
        // JPA
    }

    public PlatformSettings(short id, boolean emailVerificationEnabled) {
        this.id = id;
        this.emailVerificationEnabled = emailVerificationEnabled;
    }

    public short getId() {
        return id;
    }

    public boolean isEmailVerificationEnabled() {
        return emailVerificationEnabled;
    }

    public void setEmailVerificationEnabled(boolean emailVerificationEnabled) {
        this.emailVerificationEnabled = emailVerificationEnabled;
    }
}
