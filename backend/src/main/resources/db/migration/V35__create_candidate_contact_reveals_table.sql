-- Tracks which companies have already revealed which candidate's contact number, via
-- SearchCandidatesPage's "View contact" button — persisted so a company sees the number again
-- on a later visit instead of needing to click through every time (see
-- CandidateSearchService.revealContact).
create table candidate_contact_reveals (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references users (id) on delete cascade,
    candidate_id uuid not null references users (id) on delete cascade,
    revealed_at timestamptz not null default now(),
    constraint candidate_contact_reveals_unique unique (company_id, candidate_id)
);

create index idx_candidate_contact_reveals_company on candidate_contact_reveals (company_id);
