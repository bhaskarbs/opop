package com.openopportunity.admin.dto;

import java.time.Instant;
import java.util.UUID;

/** One "know more about community income" submission (see CommunityInterestSubmission) —
 * companyName/phone are nullable since anonymous visitors aren't required to give them. */
public record AdminCommunityInterestSummary(
        UUID id, String name, String companyName, String email, String phone, Instant submittedAt) {}
