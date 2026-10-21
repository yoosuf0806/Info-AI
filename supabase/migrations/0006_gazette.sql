-- =============================================================================
-- InfoAI.LK — Gazette ingestion (officer review queue)
--
-- A scheduled job (or a manual officer action) discovers government Gazette PDFs,
-- extracts candidate procedure updates, and files them here as PENDING for an
-- officer to review. Nothing reaches citizens automatically: an officer must
-- APPROVE a candidate, which creates a DRAFT procedure they then verify and
-- publish through the normal flow (which chunks + embeds it). This preserves the
-- "only officer-verified content" guarantee.
-- =============================================================================

do $$ begin
  create type gazette_candidate_status as enum ('pending', 'approved', 'dismissed');
exception when duplicate_object then null; end $$;

-- --- discovered / ingested Gazette PDFs -------------------------------------
create table if not exists gazette_documents (
  id           uuid primary key default gen_random_uuid(),
  source_url   text not null unique,          -- the PDF URL
  gazette_number text,
  title        text,
  published_date date,
  text_excerpt text,                           -- extracted text (truncated)
  char_count   integer not null default 0,
  status       text not null default 'fetched', -- 'fetched' | 'extracted' | 'error'
  error        text,
  fetched_at   timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists idx_gazette_docs_status on gazette_documents(status);
create index if not exists idx_gazette_docs_fetched on gazette_documents(fetched_at desc);

-- --- extracted candidate procedure updates, pending officer review ----------
create table if not exists gazette_candidates (
  id             uuid primary key default gen_random_uuid(),
  gazette_id     uuid not null references gazette_documents(id) on delete cascade,
  category_id    uuid references categories(id) on delete set null,
  suggested_title text not null,
  suggested_body  text not null,
  suggested_source_department text,
  suggested_fees  text,
  suggested_timeline text,
  source_excerpt text,                         -- snippet the suggestion is drawn from
  relevance      text,                         -- why it matters / what changed
  status         gazette_candidate_status not null default 'pending',
  reviewed_by    uuid,                         -- officer (auth.users.id)
  procedure_id   uuid references procedures(id) on delete set null, -- created on approve
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_gazette_cand_status on gazette_candidates(status, created_at desc);
create index if not exists idx_gazette_cand_gazette on gazette_candidates(gazette_id);
drop trigger if exists trg_gazette_cand_updated on gazette_candidates;
create trigger trg_gazette_cand_updated before update on gazette_candidates
  for each row execute function set_updated_at();

-- --- RLS: officer-only. The scan job runs under the service role (bypasses RLS).
alter table gazette_documents  enable row level security;
alter table gazette_candidates enable row level security;

drop policy if exists gazette_docs_officer on gazette_documents;
create policy gazette_docs_officer on gazette_documents
  for all to authenticated using (true) with check (true);

drop policy if exists gazette_cand_officer on gazette_candidates;
create policy gazette_cand_officer on gazette_candidates
  for all to authenticated using (true) with check (true);
