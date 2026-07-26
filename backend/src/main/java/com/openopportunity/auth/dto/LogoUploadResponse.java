package com.openopportunity.auth.dto;

/** logoUrl is a relative path (e.g. "/api/companies/{id}/logo") — the frontend prefixes it with
 * the same API base URL it uses for every other request. */
public record LogoUploadResponse(String logoUrl) {}
