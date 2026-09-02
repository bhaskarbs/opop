package com.openopportunity.careerguide.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

/** orderedStepIds must contain every existing step's id exactly once, in the desired new order —
 * see AdminCareerGuideStepService#reorder. */
public record ReorderCareerGuideStepsRequest(@NotEmpty List<UUID> orderedStepIds) {}
