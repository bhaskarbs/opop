package com.openopportunity.auth.dto;

import com.openopportunity.auth.Gender;
import com.openopportunity.auth.MaritalStatus;
import com.openopportunity.job.ExperienceLevel;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;

/** location/title/experienceLevel/industry/gender/maritalStatus/dateOfBirth/address/languages
 * are all optional — none is collected at registration, so a candidate may not have filled them
 * in yet. */
public record UpdatePersonalDetailsRequest(
        @NotBlank String fullName,
        String location,
        String title,
        @NotBlank String mobile,
        ExperienceLevel experienceLevel,
        String industry,
        Gender gender,
        MaritalStatus maritalStatus,
        LocalDate dateOfBirth,
        String address,
        List<String> languages) {}
