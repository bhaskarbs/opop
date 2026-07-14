package com.openopportunity.auth.dto;

/** Free text, both optional — a candidate may only fill in one of the two. */
public record UpdateGoalsRequest(String lifeGoals, String workCulture) {}
