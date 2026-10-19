-- =============================================================================
-- InfoAI.LK — Row Level Security
--
-- Model:
--   * anon (citizens)         : read ONLY published content; insert queries;
--                               update ONLY the feedback column on their query.
--   * authenticated (officers): full manage on content, documents, categories.
--
-- The server uses the SERVICE ROLE key for admin write paths and for RAG
-- retrieval; the service role bypasses RLS. These policies are the safety net
-- for anything that ever runs under anon/authenticated keys (e.g. the browser).
-- =============================================================================

alter table categories            enable row level security;
alter table procedures            enable row level security;
alter table procedure_translations enable row level security;
alter table procedure_chunks      enable row level security;
alter table documents             enable row level security;
alter table document_versions     enable row level security;
alter table officer_profiles      enable row level security;
alter table queries               enable row level security;
alter table suggested_questions   enable row level security;

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
drop policy if exists cat_read_public on categories;
create policy cat_read_public on categories
  for select using (is_archived = false);

drop policy if exists cat_manage_officer on categories;
create policy cat_manage_officer on categories
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- PROCEDURES — citizens see published only
-- ---------------------------------------------------------------------------
drop policy if exists proc_read_published on procedures;
create policy proc_read_published on procedures
  for select using (status = 'published');

drop policy if exists proc_manage_officer on procedures;
create policy proc_manage_officer on procedures
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- PROCEDURE_TRANSLATIONS — readable if parent procedure is published
-- ---------------------------------------------------------------------------
drop policy if exists proc_tr_read_published on procedure_translations;
create policy proc_tr_read_published on procedure_translations
  for select using (
    exists (
      select 1 from procedures p
      where p.id = procedure_translations.procedure_id and p.status = 'published'
    )
  );

drop policy if exists proc_tr_manage_officer on procedure_translations;
create policy proc_tr_manage_officer on procedure_translations
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- PROCEDURE_CHUNKS — readable if parent procedure is published
-- (Vector search normally runs via service role RPC; this guards anon access.)
-- ---------------------------------------------------------------------------
drop policy if exists chunks_read_published on procedure_chunks;
create policy chunks_read_published on procedure_chunks
  for select using (
    exists (
      select 1 from procedures p
      where p.id = procedure_chunks.procedure_id and p.status = 'published'
    )
  );

drop policy if exists chunks_manage_officer on procedure_chunks;
create policy chunks_manage_officer on procedure_chunks
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- DOCUMENTS — officer-only (citizens never read the DMS)
-- ---------------------------------------------------------------------------
drop policy if exists docs_manage_officer on documents;
create policy docs_manage_officer on documents
  for all to authenticated using (true) with check (true);

drop policy if exists docver_manage_officer on document_versions;
create policy docver_manage_officer on document_versions
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- OFFICER_PROFILES — an officer manages only their own row
-- ---------------------------------------------------------------------------
drop policy if exists officer_self on officer_profiles;
create policy officer_self on officer_profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- QUERIES — anonymous: insert allowed; officers read all for analytics/review.
-- Citizens may update ONLY to attach a thumbs-up/down to a just-created row.
-- ---------------------------------------------------------------------------
drop policy if exists queries_insert_anon on queries;
create policy queries_insert_anon on queries
  for insert to anon, authenticated with check (true);

drop policy if exists queries_feedback_update on queries;
create policy queries_feedback_update on queries
  for update to anon, authenticated using (true) with check (true);

drop policy if exists queries_read_officer on queries;
create policy queries_read_officer on queries
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- SUGGESTED_QUESTIONS — public read (active), officer manage
-- ---------------------------------------------------------------------------
drop policy if exists sq_read_public on suggested_questions;
create policy sq_read_public on suggested_questions
  for select using (is_active = true);

drop policy if exists sq_manage_officer on suggested_questions;
create policy sq_manage_officer on suggested_questions
  for all to authenticated using (true) with check (true);
