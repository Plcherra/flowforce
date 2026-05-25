-- Phase 7 follow-up: company update media supports generic attachments in
-- the current product flow, so do not constrain MIME types at the bucket level.

update storage.buckets
set allowed_mime_types = null
where id = 'company-updates-media';
