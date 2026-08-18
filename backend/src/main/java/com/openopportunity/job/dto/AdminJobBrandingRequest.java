package com.openopportunity.job.dto;

/** displayCompanyName null or blank clears the override — see JobService#adminUpdateBranding. */
public record AdminJobBrandingRequest(String displayCompanyName) {}
