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

    // Only meaningful when role == ADMIN — see AdminLevel.
    @Enumerated(EnumType.STRING)
    @Column(name = "admin_level", length = 20)
    private AdminLevel adminLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 10)
    private AccountStatus accountStatus;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Null until the first successful login — see AuthService#login/loginWithGoogle/
    // loginWithGoogleAsCompany. Not touched by refresh(), since that's a continuation of an
    // existing session rather than a new login.
    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    // Backs the "most active" sort (CandidateSearchService) — total successful logins, not just
    // the most recent one. Incremented alongside lastLoginAt by recordLogin(), so the two always
    // move together.
    @Column(name = "login_count", nullable = false)
    private int loginCount;

    protected User() {
        // JPA
    }

    public User(String email, String passwordHash, String fullName, UserRole role) {
        this(email, passwordHash, fullName, role, null);
    }

    /** For creating admin-tier accounts — see AdminTeamService (super-admin-created reviewer/
     * admin accounts) and AdminSeeder (the one bootstrap super-admin). adminLevel must be null
     * for any non-ADMIN role. */
    public User(String email, String passwordHash, String fullName, UserRole role, AdminLevel adminLevel) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.role = role;
        this.adminLevel = adminLevel;
        this.accountStatus = AccountStatus.ACTIVE;
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

    public void recordLogin() {
        this.lastLoginAt = Instant.now();
        this.loginCount++;
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

    public AdminLevel getAdminLevel() {
        return adminLevel;
    }

    public AccountStatus getAccountStatus() {
        return accountStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public int getLoginCount() {
        return loginCount;
    }
}
