package com.openopportunity.auth.dto;

import java.time.Instant;

public record CertificateUploadResponse(
        String certificateFileName, Instant certificateUploadedAt, long certificateSizeBytes) {}
