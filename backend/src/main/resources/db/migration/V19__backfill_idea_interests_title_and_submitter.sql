-- V18 added idea_title/idea_submitter_name defaulted to '' — any interest row created before
-- that column existed (i.e. while V17 alone was applied) is stuck with a blank value that
-- IdeaService never revisits after creation. Backfill those from the `ideas` table they still
-- point at via idea_id.
update idea_interests ii
set idea_title = i.title,
    idea_submitter_name = i.submitter_name
from ideas i
where ii.idea_id = i.id
  and ii.idea_title = '';
