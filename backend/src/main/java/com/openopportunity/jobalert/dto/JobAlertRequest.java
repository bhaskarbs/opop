package com.openopportunity.jobalert.dto;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.WorkMode;
import java.util.List;

/** keywords/locations/experienceLevel/workMode are all optional — an alert with none of them
 * set just means "notify me about every new job" (see JobAlertService.create, which doesn't
 * reject that). */
public record JobAlertRequest(
        List<String> keywords, List<String> locations, ExperienceLevel experienceLevel, WorkMode workMode) {}
