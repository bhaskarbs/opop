package com.openopportunity.auth.dto;

import com.openopportunity.auth.NoticePeriod;
import java.math.BigDecimal;

/** Every field optional — none of these is collected at registration, same treatment as
 * UpdatePersonalDetailsRequest's location/title/experienceLevel/industry. */
public record UpdateBackgroundRequest(
        BigDecimal yearsOfExperience,
        BigDecimal currentSalaryLakhs,
        NoticePeriod noticePeriod,
        String educationDegree,
        String educationInstitution,
        Integer educationGraduationYear) {}
