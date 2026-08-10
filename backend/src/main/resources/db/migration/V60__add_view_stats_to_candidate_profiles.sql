-- Backs the candidate dashboard's "search appearances" / "recruiter views" stats — previously
-- mocked on the frontend with a comment noting no real tracking existed (see
-- CandidateDashboardPage). Both start at 0 for every existing row, incremented going forward by
-- CandidateSearchService.search()/get() respectively.
alter table candidate_profiles
    add column search_appearance_count integer not null default 0,
    add column profile_view_count integer not null default 0;
