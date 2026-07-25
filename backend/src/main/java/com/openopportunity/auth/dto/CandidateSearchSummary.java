package com.openopportunity.auth.dto;

import java.util.List;
import java.util.UUID;

/** No email — this is the search-results view a company browses, not a page a candidate has
 * agreed to hand contact details over on; deliberately narrower than CandidateProfileResponse
 * (the candidate's own view of their full profile). contactNumber is null until the requesting
 * company has clicked "View contact" (see CandidateSearchService.revealContact) — once
 * revealed, it comes back populated on every later search too, so the number stays visible on
 * return visits instead of needing another click. */
public record CandidateSearchSummary(
        UUID userId,
        String fullName,
        String title,
        String location,
        List<String> skills,
        String contactNumber) {}
