package com.openopportunity.sharedvideo;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** A video an admin has uploaded specifically to share with external people (candidates,
 * partners, whoever) via per-recipient links — see AdminVideoShare, one row per recipient. */
@Entity
@Table(name = "admin_shared_videos")
public class AdminSharedVideo {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "uploaded_by", nullable = false, updatable = false)
    private UUID uploadedBy;

    @Column(nullable = false)
    private String title;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected AdminSharedVideo() {
        // JPA
    }

    public AdminSharedVideo(
            UUID uploadedBy,
            String title,
            String storageKey,
            String contentType,
            long sizeBytes,
            Integer durationSeconds) {
        this.id = UUID.randomUUID();
        this.uploadedBy = uploadedBy;
        this.title = title;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.durationSeconds = durationSeconds;
        // Set here rather than via @PrePersist — a callback wouldn't fire until the transaction
        // flushes, which is too late for AdminVideoService.upload to read it back into the
        // response DTO in the same method (same reasoning as CandidateWorkSample etc.).
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUploadedBy() {
        return uploadedBy;
    }

    public String getTitle() {
        return title;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getContentType() {
        return contentType;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
