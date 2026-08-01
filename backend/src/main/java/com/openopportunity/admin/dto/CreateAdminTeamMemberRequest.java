package com.openopportunity.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** adminLevel is a plain String, not AdminLevel, the same way RegisterRequest.role is a String —
 * AdminTeamService validates it (rejecting anything but REVIEWER/ADMIN) rather than letting bean
 * validation 400 on a bad enum value before that more specific error can be produced. */
public record CreateAdminTeamMemberRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, message = "Password must be at least 8 characters") String password,
        @NotBlank String fullName,
        @NotBlank String adminLevel) {}
