package com.openopportunity.admin.dto;

import java.util.List;

public record AdminDashboardStats(
        long totalCandidates,
        long registeredCompanies,
        long liveJobPostings,
        // Total idea_interests rows — every INVESTOR/PARTICIPANT expression of interest across
        // every partnership listing (see IdeaInterestRepository).
        long partnershipMatches,
        // Total community_interest_submissions rows — every "know more about community income"
        // form submission, anonymous visitors included (see CommunityInterestService).
        long communitySignUps,
        // Candidate funnel stages — distinct candidates, not raw application/interest counts,
        // so a candidate with several applications or interests only counts once.
        long candidatesAppliedToJob,
        long candidatesAppliedForPartnership,
        // Last 6 calendar months (oldest first, current month last) of raw monthly volume per
        // path — same broad definitions as partnershipMatches/communitySignUps above (all
        // roles, no distinct-candidate collapsing), just bucketed by month.
        List<MonthlyApplicationsByPath> applicationsByPath) {}
