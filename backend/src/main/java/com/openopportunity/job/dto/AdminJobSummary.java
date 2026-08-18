package com.openopportunity.job.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/** Only used by the admin job-browsing endpoint (JobController#adminSearch) — AdminJobsPage's
 * list shows companyName (which is the display-name override when one is set, same as every
 * other job listing — see JobService#displayCompanyName), but an admin managing that override
 * also needs to see the real owning account underneath it. realCompanyName is always the real
 * company account's name regardless of any override, so the two only ever visibly differ on a
 * job with an active override. */
public record AdminJobSummary(@JsonUnwrapped JobSummary summary, String realCompanyName) {}
