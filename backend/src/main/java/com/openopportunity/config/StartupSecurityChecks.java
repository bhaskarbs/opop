package com.openopportunity.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Refuses to start when running somewhere that looks like a real deployment but the JWT signing
 * secret or seeded admin password are still at their committed local-dev defaults
 * (application.properties). "Looks like a real deployment" is keyed off PORT being set — the
 * same Cloud Run signal server.port already reads (see its comment) — so local dev, which never
 * sets PORT, is completely unaffected by this check; the whole point is to keep local-first
 * zero-config startup working while catching the one real risk: someone deploying this app
 * outside the Terraform path (infra/secrets.tf generates real random values for both) and
 * forgetting to override APP_JWT_SECRET/APP_ADMIN_SEED_PASSWORD, which would otherwise let
 * anyone who's read this repo forge a valid JWT for any user or log in as the seeded admin.
 *
 * <p>Ordered first among CommandLineRunners so this fails before AdminSeeder ever gets a chance
 * to seed an admin account with the weak default password.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class StartupSecurityChecks implements CommandLineRunner {

    static final String DEFAULT_JWT_SECRET = "a403438eb69850b8afda1af1bc448e65849fe6331e3e6018b397aa8f73ccf4c1";
    static final String DEFAULT_ADMIN_SEED_PASSWORD = "AdminPass123!";

    private final boolean looksLikeARealDeployment;
    private final String jwtSecret;
    private final String adminSeedPassword;

    public StartupSecurityChecks(
            @Value("${PORT:}") String port,
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${app.admin.seed-password}") String adminSeedPassword) {
        this.looksLikeARealDeployment = !port.isBlank();
        this.jwtSecret = jwtSecret;
        this.adminSeedPassword = adminSeedPassword;
    }

    @Override
    public void run(String... args) {
        if (!looksLikeARealDeployment) {
            return;
        }
        if (DEFAULT_JWT_SECRET.equals(jwtSecret)) {
            throw new IllegalStateException(
                    "Refusing to start: APP_JWT_SECRET is still the committed local-dev default. Set a"
                            + " real secret (see infra/secrets.tf for how the Terraform deployment generates"
                            + " one).");
        }
        if (DEFAULT_ADMIN_SEED_PASSWORD.equals(adminSeedPassword)) {
            throw new IllegalStateException(
                    "Refusing to start: APP_ADMIN_SEED_PASSWORD is still the committed local-dev default."
                            + " Set a real password (see infra/secrets.tf for how the Terraform deployment"
                            + " generates one).");
        }
    }
}
