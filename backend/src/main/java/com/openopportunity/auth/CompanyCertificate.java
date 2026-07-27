package com.openopportunity.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** One verification document (certificate of incorporation, etc.) a company has on file — a
 * company may have up to CompanyCertificateService.MAX_CERTIFICATES of these. Uploaded either
 * at registration or later from CompanyProfilePage; both go through the same
 * CompanyCertificateService.upload. */
@Entity
@Table(name = "company_certificates")
public class CompanyCertificate {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "company_id", nullable = false, updatable = false)
    private UUID companyId;

    @Column(name = "storage_key", nullable = false, length = 500)
    private String storageKey;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;

    protected CompanyCertificate() {
        // JPA
    }

    public CompanyCertificate(
            UUID companyId, String storageKey, String contentType, String fileName, long sizeBytes) {
        this.id = UUID.randomUUID();
        this.companyId = companyId;
        this.storageKey = storageKey;
        this.contentType = contentType;
        this.fileName = fileName;
        this.sizeBytes = sizeBytes;
        // Set here rather than via @PrePersist — a callback wouldn't fire until the transaction
        // flushes, which is too late for CompanyCertificateService.upload to read it back into
        // the response DTO in the same method.
        this.uploadedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCompanyId() {
        return companyId;
    }

    public String getStorageKey() {
        return storageKey;
    }

    public String getContentType() {
        return contentType;
    }

    public String getFileName() {
        return fileName;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }
}
