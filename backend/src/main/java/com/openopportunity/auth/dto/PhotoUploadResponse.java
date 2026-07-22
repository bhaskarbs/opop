package com.openopportunity.auth.dto;

/** photoUrl is a relative path (e.g. "/api/candidates/{id}/photo") — the frontend prefixes it
 * with the same API base URL it uses for every other request. */
public record PhotoUploadResponse(String photoUrl) {}
