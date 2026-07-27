package com.openopportunity.auth.dto;

import java.time.Instant;
import java.util.UUID;

public record CompanyCertificateSummary(UUID id, String fileName, Instant uploadedAt, long sizeBytes) {}
