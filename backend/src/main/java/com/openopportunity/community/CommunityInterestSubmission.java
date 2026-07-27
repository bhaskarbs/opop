package com.openopportunity.community;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A "know more about community income" submission from the Community page — anonymous
 * visitors and signed-in candidates alike (see CommunityInterestService), counted as
 * "Community sign-ups" on the admin dashboard. */
@Entity
@Table(name = "community_interest_submissions")
public class CommunityInterestSubmission {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, updatable = false)
    private String name;

    @Column(name = "company_name", updatable = false)
    private String companyName;

    @Column(nullable = false, updatable = false)
    private String email;

    @Column(updatable = false)
    private String phone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CommunityInterestSubmission() {
        // JPA
    }

    public CommunityInterestSubmission(String name, String companyName, String email, String phone) {
        this.id = UUID.randomUUID();
        this.name = name;
        this.companyName = companyName;
        this.email = email;
        this.phone = phone;
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
