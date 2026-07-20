package com.openopportunity.notification.dto;

import com.openopportunity.notification.NotificationType;
import java.time.Instant;
import java.util.UUID;

public record NotificationSummary(
        UUID id, NotificationType type, String message, String link, boolean read, Instant createdAt) {}
