package com.openopportunity.auth.dto;

import com.openopportunity.job.ExperienceLevel;
import jakarta.validation.constraints.NotBlank;

/** location/title/experienceLevel/industry are all optional — none is collected at
 * registration, so a candidate may not have filled them in yet. */
public record UpdatePersonalDetailsRequest(
        @NotBlank String fullName,
        String location,
        String title,
        @NotBlank String mobile,
        ExperienceLevel experienceLevel,
        String industry) {}
