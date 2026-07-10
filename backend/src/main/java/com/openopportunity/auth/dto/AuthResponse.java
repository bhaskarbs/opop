package com.openopportunity.auth.dto;

// Deliberately excludes the refresh token — it only ever travels as the httpOnly
// refreshToken cookie set alongside this response, never in a body a script can read.
public record AuthResponse(String accessToken, String tokenType, long expiresInSeconds, UserSummary user) {}
