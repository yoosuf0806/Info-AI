-- =============================================================================
-- InfoAI.LK — Schema
-- Postgres + pgvector on Supabase.
--
-- NOTE ON EMBEDDING DIMENSION:
--   procedure_chunks.embedding is vector(768) to match GEMINI_EMBEDDING_DIM=768
--   (gemini-embedding-001 truncated + L2-normalized to 768 dims).
--   If you change the embedding dimension, change vector(768) here AND
--   GEMINI_EMBEDDING_DIM, then re-embed all published procedures.
-- =============================================================================

create extension if not exists "vector";
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- --- enums ------------------------------------------------------------------
do $$ begin
  create type language_code as enum ('en', 'si', 'ta');
exception when duplicate_object then null; end $$;

do $$ begin
  create type procedure_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_value as enum ('up', 'down');
exception when duplicate_object then null; end $$;

-- --- updated_at helper ------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- categories -------------------------------------------------------------
create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,
  display_order integer not null default 0,
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists trg_categories_updated on categories;
create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();

-- --- procedures ------------------------------------------------------------
create table if not exists procedures (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid references categories(id) on delete set null,
  title              text not null,
  body               text not null default '',
  source_department  text not null default '',
  fees               text,           -- free text (e.g. "Rs. 1,000 + Rs. 200 stamp")
  timeline           text,           -- free text (e.g. "7–10 working days")
  authoring_language language_code not null default 'en',
  last_verified_date date,
  status             procedure_status not null default 'draft',
  created_by         uuid,           -- auth.users.id of authoring officer
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_procedures_category on procedures(category_id);
create index if not exists idx_procedures_status on procedures(status);
drop trigger if exists trg_procedures_updated on procedures;
create trigger trg_procedures_updated before update on procedures
  for each row execute function set_updated_at();

-- --- procedure_translations (officer-verified overrides) --------------------
create table if not exists procedure_translations (
  id            uuid primary key default gen_random_uuid(),
  procedure_id  uuid not null references procedures(id) on delete cascade,
  language      language_code not null,
  verified_body text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (procedure_id, language)
);
drop trigger if exists trg_proc_tr_updated on procedure_translations;
create trigger trg_proc_tr_updated before update on procedure_translations
  for each row execute function set_updated_at();

-- --- procedure_chunks (RAG vector store) -----------------------------------
create table if not exists procedure_chunks (
  id           uuid primary key default gen_random_uuid(),
  procedure_id uuid not null references procedures(id) on delete cascade,
  chunk_index  integer not null,
  chunk_text   text not null,
  embedding    vector(768) not null,
  created_at   timestamptz not null default now(),
  unique (procedure_id, chunk_index)
);
-- Approximate-nearest-neighbour index (cosine). ivfflat needs data before it
-- helps; safe to create now, tune `lists` as the corpus grows.
create index if not exists idx_chunks_embedding
  on procedure_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_chunks_procedure on procedure_chunks(procedure_id);

-- --- documents (DMS) -------------------------------------------------------
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references categories(id) on delete set null,
  procedure_id uuid references procedures(id) on delete set null,
  title        text not null,
  file_path    text not null,          -- path within Supabase Storage bucket
  file_type    text,                   -- 'pdf' | 'docx' | ...
  version      integer not null default 1,
  is_archived  boolean not null default false,
  uploaded_by  uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_documents_category on documents(category_id);
create index if not exists idx_documents_procedure on documents(procedure_id);
drop trigger if exists trg_documents_updated on documents;
create trigger trg_documents_updated before update on documents
  for each row execute function set_updated_at();

-- --- document_versions (history) -------------------------------------------
create table if not exists document_versions (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  version     integer not null,
  file_path   text not null,
  file_type   text,
  uploaded_by uuid,
  created_at  timestamptz not null default now(),
  unique (document_id, version)
);

-- --- officer profiles (mirrors auth.users) ---------------------------------
create table if not exists officer_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

-- --- queries (anonymous analytics + feedback) ------------------------------
create table if not exists queries (
  id                 uuid primary key default gen_random_uuid(),
  question_text      text not null,
  language           language_code not null,
  retrieved_chunk_ids uuid[] not null default '{}',
  answer_text        text,
  answered           boolean not null default false, -- false = "no info" fallback
  feedback           feedback_value,                 -- null until a citizen votes
  created_at         timestamptz not null default now()
);
create index if not exists idx_queries_created on queries(created_at desc);
create index if not exists idx_queries_feedback on queries(feedback);

-- --- suggested_questions ---------------------------------------------------
create table if not exists suggested_questions (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references categories(id) on delete cascade,
  question_text text not null,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
