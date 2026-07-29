package com.openopportunity.admin.dto;

import java.util.List;

public record AdminEmployerReportStats(
        long registeredCompanies,
        long verifiedCompanies,
        long liveJobPostings,
        // Sector = the posting company's CompanyProfile.industry — sorted by openJobs desc.
        // applications sums each job's live applicantCount (not a historical/all-time count),
        // so a withdrawn application isn't counted.
        List<SectorHiringStats> topHiringSectors) {}
