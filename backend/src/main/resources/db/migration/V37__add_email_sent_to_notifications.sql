-- Tracks whether NotificationService actually delivered a real email for this notification
-- (see NotificationService.notify) — backs the company dashboard's real "Notifications sent"
-- count, distinct from `read` which tracks the in-app bell only.
alter table notifications add column email_sent boolean not null default false;
