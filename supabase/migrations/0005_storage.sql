-- =============================================================================
-- InfoAI.LK — Storage bucket for official documents
--
-- Private bucket: citizens never access it. Officers upload via server routes
-- using the service role; downloads are served via short-lived signed URLs.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Authenticated officers may read/write objects in the documents bucket.
drop policy if exists "documents officer read" on storage.objects;
create policy "documents officer read" on storage.objects
  for select to authenticated using (bucket_id = 'documents');

drop policy if exists "documents officer write" on storage.objects;
create policy "documents officer write" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

drop policy if exists "documents officer update" on storage.objects;
create policy "documents officer update" on storage.objects
  for update to authenticated using (bucket_id = 'documents');

drop policy if exists "documents officer delete" on storage.objects;
create policy "documents officer delete" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');
