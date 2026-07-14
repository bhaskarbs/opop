package com.openopportunity.auth.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record UpdateSkillsRequest(@NotEmpty List<String> skills) {}
