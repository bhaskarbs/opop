package com.openopportunity.job.dto;

import java.util.List;

/** Admin counterpart to JobSearchResult — see AdminJobSummary for why this needs its own shape
 * rather than reusing JobSearchResult directly. */
public record AdminJobSearchResult(List<AdminJobSummary> jobs, int page, int size, int totalCount, int totalPages) {}
