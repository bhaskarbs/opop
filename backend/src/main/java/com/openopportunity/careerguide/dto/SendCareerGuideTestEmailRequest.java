package com.openopportunity.careerguide.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendCareerGuideTestEmailRequest(@NotBlank @Email String email) {}
