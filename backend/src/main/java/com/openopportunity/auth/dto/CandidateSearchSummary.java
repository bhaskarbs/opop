package com.openopportunity.auth.dto;

import java.util.List;
import java.util.UUID;

/** No email/mobile — this is the search-results view a company browses, not a page a
 * candidate has agreed to hand contact details over on; deliberately narrower than
 * CandidateProfileResponse (the candidate's own view of their full profile). */
public record CandidateSearchSummary(
        UUID userId, String fullName, String title, String location, List<String> skills) {}
