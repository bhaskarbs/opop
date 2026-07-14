package com.openopportunity.auth.dto;

import java.time.Instant;

public record ResumeUploadResponse(String resumeFileName, Instant resumeUploadedAt, long resumeSizeBytes) {}
