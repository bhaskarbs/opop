package com.openopportunity.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class StartupSecurityChecksTest {

    private static final String DEFAULT_JWT_SECRET = StartupSecurityChecks.DEFAULT_JWT_SECRET;
    private static final String DEFAULT_ADMIN_SEED_PASSWORD = StartupSecurityChecks.DEFAULT_ADMIN_SEED_PASSWORD;
    private static final String REAL_SECRET = "a-real-generated-secret-not-the-default";
    private static final String REAL_PASSWORD = "a-real-generated-password";

    @Test
    void doesNothingLocallyEvenWithDefaultSecretsSincePortIsUnset() {
        StartupSecurityChecks check =
                new StartupSecurityChecks("", DEFAULT_JWT_SECRET, DEFAULT_ADMIN_SEED_PASSWORD);

        assertThatCode(check::run).doesNotThrowAnyException();
    }

    @Test
    void refusesToStartWhenPortIsSetAndTheJwtSecretIsStillTheDefault() {
        StartupSecurityChecks check =
                new StartupSecurityChecks("8080", DEFAULT_JWT_SECRET, REAL_PASSWORD);

        assertThatThrownBy(check::run).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void refusesToStartWhenPortIsSetAndTheAdminSeedPasswordIsStillTheDefault() {
        StartupSecurityChecks check =
                new StartupSecurityChecks("8080", REAL_SECRET, DEFAULT_ADMIN_SEED_PASSWORD);

        assertThatThrownBy(check::run).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void startsWhenPortIsSetAndBothSecretsAreOverridden() {
        StartupSecurityChecks check = new StartupSecurityChecks("8080", REAL_SECRET, REAL_PASSWORD);

        assertThatCode(check::run).doesNotThrowAnyException();
    }
}
