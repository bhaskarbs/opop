package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** location/title are optional — neither is collected at registration, so a candidate may
 * not have filled them in yet. */
public record UpdatePersonalDetailsRequest(
        @NotBlank String fullName, String location, String title, @NotBlank String mobile) {}
