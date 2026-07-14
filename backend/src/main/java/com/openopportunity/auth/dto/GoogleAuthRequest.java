package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** idToken is the Google-issued JWT credential handed back by Google Identity Services'
 * Sign-In-With-Google button on the frontend — not a Google OAuth access token. */
public record GoogleAuthRequest(@NotBlank String idToken) {}
