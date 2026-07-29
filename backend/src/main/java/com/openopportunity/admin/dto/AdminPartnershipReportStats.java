package com.openopportunity.admin.dto;

public record AdminPartnershipReportStats(
        long totalPartnershipMatches,
        // APPROVED ideas — the publicly visible partnership listings (see IdeaStatus).
        long startupsOffering,
        // startupsOffering split by whether the idea specified a funding ask (see
        // IdeaRepository.countByStatusAndFundingIsNotNull/IsNull) — fundedListings +
        // listingsWithoutFunding always equals startupsOffering.
        long fundedListings,
        long listingsWithoutFunding) {}
