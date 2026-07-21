-- Distinguishes a first-time PENDING submission from one bounced back to PENDING by the
-- submitter editing an idea the admin had already looked at (see Idea.update()) — the frontend
-- uses this to label the latter "Updated — changes pending review" instead of plain
-- "Pending review".
alter table ideas add column edited boolean not null default false;
