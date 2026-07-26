-- Marks the start of the current contact-quota window (see
-- CandidateSearchService.getContactQuota) — every checkout/renewal resets it to "now" so the
-- 50/250 contact-reveal quota refreshes each billing period rather than accumulating.
alter table company_subscriptions add column current_period_start timestamptz;
