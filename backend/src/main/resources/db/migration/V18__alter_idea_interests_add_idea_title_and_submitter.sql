-- Added after V17 shipped without this denormalization — a candidate's own "my interests
-- across ideas" listing (ApplicationsPage's Partnership tab, see IdeaService.getMyInterests)
-- needs the idea's title/submitter alongside each interest without a cross-table join back to
-- `ideas`, same reasoning as applications.job_title/company_name (see V5). Defaulted rather than
-- left nullable since idea_interests is expected to be empty at this point in any environment
-- that's reached V17 — same convention as V6's account_status.
alter table idea_interests
    add column idea_title varchar(255) not null default '',
    add column idea_submitter_name varchar(255) not null default '';
