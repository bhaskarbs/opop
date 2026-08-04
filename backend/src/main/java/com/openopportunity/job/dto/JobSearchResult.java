package com.openopportunity.job.dto;

import java.util.List;

/** page/size echo back what was actually applied (after JobService's own bounds-clamping), not
 * necessarily the raw request values — a client shouldn't have to guess whether an out-of-range
 * page or size got silently adjusted. */
public record JobSearchResult(List<JobSummary> jobs, int page, int size, int totalCount, int totalPages) {}
