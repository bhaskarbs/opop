package com.openopportunity.community.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CommunityInterestRequest(
        @NotBlank String name, String companyName, @NotBlank @Email String email, String phone) {}
