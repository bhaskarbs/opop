-- Added after V20 shipped without a thumbnail — nullable since not every recording will have
-- one (e.g. the browser failed to capture a frame client-side); MockInterviewController serves
-- a 404 for /thumbnail when absent and the frontend falls back to a generic placeholder.
alter table mock_interview_sessions
    add column thumbnail_storage_key varchar(500),
    add column thumbnail_content_type varchar(100);
