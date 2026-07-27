package com.openopportunity.admin.dto;

public record AdminDashboardStats(
        long totalCandidates,
        long registeredCompanies,
        long liveJobPostings,
        // Total idea_interests rows — every INVESTOR/PARTICIPANT expression of interest across
        // every partnership listing (see IdeaInterestRepository).
        long partnershipMatches,
        // Total community_interest_submissions rows — every "know more about community income"
        // form submission, anonymous visitors included (see CommunityInterestService).
        long communitySignUps) {}
