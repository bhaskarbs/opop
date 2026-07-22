package com.openopportunity.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

/** email is unique per role, not globally (see V14 migration) — the same address can hold a
 * separate candidate account and company account, since those are distinct login contexts
 * with their own login pages (LoginPage vs. CompanyLoginPage). */
@Entity
@Table(
        name = "users",
        uniqueConstraints = @UniqueConstraint(name = "users_email_role_key", columnNames = {"email", "role"}))
public class User {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 10)
    private AccountStatus accountStatus;

    // Defaults true (see constructor) — only AuthService.register() flips this false, and only
    // for a CANDIDATE registering with email/password (see EmailVerificationFilter for the
    // resulting gate). Google sign-in, company/admin accounts never need it: Google already
    // confirmed the email, and there's no verification concept for company/admin.
    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected User() {
        // JPA
    }

    public User(String email, String passwordHash, String fullName, UserRole role) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.role = role;
        this.accountStatus = AccountStatus.ACTIVE;
        this.emailVerified = true;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isSuspended() {
        return accountStatus == AccountStatus.SUSPENDED;
    }

    public void suspend() {
        this.accountStatus = AccountStatus.SUSPENDED;
    }

    public void reactivate() {
        this.accountStatus = AccountStatus.ACTIVE;
    }

    public void updateFullName(String fullName) {
        this.fullName = fullName;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void markEmailUnverified() {
        this.emailVerified = false;
    }

    public void markEmailVerified() {
        this.emailVerified = true;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getFullName() {
        return fullName;
    }

    public UserRole getRole() {
        return role;
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
