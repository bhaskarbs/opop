package com.openopportunity.admin;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Local dev only — there's no admin registration flow (by design, see
 * AuthService#parseRegistrationRole), so this seeds exactly one admin account on startup if it
 * doesn't already exist yet, using the same PasswordEncoder real registrations go through. */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String seedEmail;
    private final String seedPassword;

    public AdminSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.seed-email}") String seedEmail,
            @Value("${app.admin.seed-password}") String seedPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedEmail = seedEmail;
        this.seedPassword = seedPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.existsByEmailAndRole(seedEmail, UserRole.ADMIN)) {
            return;
        }
        User admin = new User(seedEmail, passwordEncoder.encode(seedPassword), "Platform Admin", UserRole.ADMIN);
        userRepository.save(admin);
        log.info("Seeded admin account: {}", seedEmail);
    }
}
