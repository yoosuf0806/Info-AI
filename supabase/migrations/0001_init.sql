-- =============================================================================
-- Info-AI.LK — initial schema
-- Civic-procedures RAG platform: curated trilingual content + pgvector retrieval.
--
-- Conventions
--   * UUID primary keys (gen_random_uuid()).
--   * Trilingual authored text uses explicit _en / _si / _ta columns. English is
--     required; si/ta are nullable and the app falls back to _en when absent.
--   * Money is stored as integer LKR cents (amount_cents) to avoid float drift.
--   * updated_at is maintained by a trigger on every mutable table.
--   * Only `published` procedures are readable by anonymous/citizen roles (RLS).
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type locale            as enum ('en', 'si', 'ta');
create type procedure_status  as enum ('draft', 'in_review', 'published', 'archived');
create type user_role         as enum ('citizen', 'editor', 'admin');
create type fee_type          as enum ('standard', 'penalty', 'express', 'optional');
create type chat_role         as enum ('user', 'assistant', 'system');
create type progress_status   as enum ('pending', 'done');

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. Identity
-- =============================================================================

-- Mirrors auth.users with app-level profile fields. Row id == auth.users.id.
create table profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  role              user_role not null default 'citizen',
  full_name         text,
  phone             text,
  preferred_locale  locale not null default 'en',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- SECURITY DEFINER helpers used by RLS policies (avoid recursive profile reads).
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =============================================================================
-- 2. Catalog / reference data
-- =============================================================================

-- Top-level groupings surfaced as quick links on the omnibox homepage.
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,          -- 'national-id', 'vehicles', 'water'
  icon        text,                           -- icon key for the UI
  sort_order  int  not null default 0,
  name_en     text not null,
  name_si     text,
  name_ta     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_categories_updated_at
  before update on categories
  for each row execute function set_updated_at();

-- Government offices / departments that procedures and steps reference.
create table institutions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  kind        text not null,                  -- 'police','grama_niladhari','divisional_secretariat','drp','municipal_council',...
  name_en     text not null,
  name_si     text,
  name_ta     text,
  website     text,
  contact     jsonb not null default '{}'::jsonb,  -- phones, hotline, address template
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_institutions_updated_at
  before update on institutions
  for each row execute function set_updated_at();

-- =============================================================================
-- 3. Procedures (the heart of the catalog)
-- =============================================================================

create table procedures (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,            -- 'replace-lost-nic'
  category_id          uuid references categories (id) on delete set null,
  owner_institution_id uuid references institutions (id) on delete set null,
  status               procedure_status not null default 'draft',

  title_en             text not null,
  title_si             text,
  title_ta             text,
  summary_en           text,                            -- one-liner for cards/search
  summary_si           text,
  summary_ta           text,
  overview_en          text,                            -- longer markdown intro
  overview_si          text,
  overview_ta          text,

  -- free-text estimate shown to users, e.g. '3–5 working days'
  estimated_duration_en text,
  estimated_duration_si text,
  estimated_duration_ta text,

  -- search aids: synonyms, Singlish terms, common phrasings ('lost id', 'nic awt')
  keywords             text[] not null default '{}',

  version              int not null default 1,
  published_at         timestamptz,
  created_by           uuid references profiles (id) on delete set null,
  updated_by           uuid references profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_procedures_category on procedures (category_id);
create index idx_procedures_status   on procedures (status);
create index idx_procedures_keywords on procedures using gin (keywords);
create trigger trg_procedures_updated_at
  before update on procedures
  for each row execute function set_updated_at();

-- Ordered steps that the UI renders as the interactive timeline.
create table procedure_steps (
  id              uuid primary key default gen_random_uuid(),
  procedure_id    uuid not null references procedures (id) on delete cascade,
  institution_id  uuid references institutions (id) on delete set null,
  step_number     int  not null,
  title_en        text not null,
  title_si        text,
  title_ta        text,
  description_en  text not null,
  description_si  text,
  description_ta  text,
  location_hint_en text,                               -- 'your local police station'
  location_hint_si text,
  location_hint_ta text,
  online_url      text,                                -- set when the step can be done online
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (procedure_id, step_number)
);
create index idx_steps_procedure on procedure_steps (procedure_id);
create trigger trg_steps_updated_at
  before update on procedure_steps
  for each row execute function set_updated_at();

-- Physical documents the citizen must carry — powers the checklist sidebar/banner.
-- Attached to a procedure, and optionally to the specific step where it's needed.
create table required_documents (
  id             uuid primary key default gen_random_uuid(),
  procedure_id   uuid not null references procedures (id) on delete cascade,
  step_id        uuid references procedure_steps (id) on delete set null,
  name_en        text not null,
  name_si        text,
  name_ta        text,
  notes_en       text,
  notes_si       text,
  notes_ta       text,
  is_original    boolean not null default false,       -- original vs photocopy
  copies_required int not null default 1,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_docs_procedure on required_documents (procedure_id);
create trigger trg_docs_updated_at
  before update on required_documents
  for each row execute function set_updated_at();

-- Fees. Kept as line items so penalties / express / optional charges are explicit
-- and so a fee change is an UPDATE with an effective_from date (good for audit).
create table fees (
  id             uuid primary key default gen_random_uuid(),
  procedure_id   uuid not null references procedures (id) on delete cascade,
  step_id        uuid references procedure_steps (id) on delete set null,
  label_en       text not null,
  label_si       text,
  label_ta       text,
  amount_cents   bigint not null,                      -- LKR cents
  currency       text not null default 'LKR',
  kind           fee_type not null default 'standard',
  notes_en       text,
  notes_si       text,
  notes_ta       text,
  effective_from date not null default current_date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_fees_procedure on fees (procedure_id);
create trigger trg_fees_updated_at
  before update on fees
  for each row execute function set_updated_at();

-- Append-only audit of CMS edits. Snapshot is a JSON copy of the procedure graph.
create table procedure_revisions (
  id             uuid primary key default gen_random_uuid(),
  procedure_id   uuid not null references procedures (id) on delete cascade,
  editor_id      uuid references profiles (id) on delete set null,
  version        int not null,
  change_summary text,
  snapshot       jsonb not null,
  created_at     timestamptz not null default now()
);
create index idx_revisions_procedure on procedure_revisions (procedure_id, version desc);

-- =============================================================================
-- 4. RAG knowledge store (pgvector)
-- =============================================================================
-- Published procedure content is chunked per locale, embedded, and stored here.
-- content_hash lets the embed job detect stale chunks and re-embed only changes.
-- Embedding dimension is pinned to the embedding model (Gemini text-embedding-004
-- = 768). Changing the model requires a re-embed migration.

create table knowledge_chunks (
  id            uuid primary key default gen_random_uuid(),
  procedure_id  uuid references procedures (id) on delete cascade,
  source_kind   text not null,                         -- 'overview','step','document','fee','faq'
  source_ref    uuid,                                  -- row the chunk was derived from
  locale        locale not null,
  content       text not null,
  content_hash  text not null,                         -- sha256 of content; re-embed trigger
  token_count   int,
  embedding     vector(768),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_chunks_procedure on knowledge_chunks (procedure_id);
create index idx_chunks_locale     on knowledge_chunks (locale);
-- Approximate nearest-neighbour index (cosine). Build after bulk load for best lists.
create index idx_chunks_embedding
  on knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create trigger trg_chunks_updated_at
  before update on knowledge_chunks
  for each row execute function set_updated_at();

-- Similarity search RPC used by /api/ask. Returns the closest chunks (optionally
-- restricted to a locale) with their similarity and source procedure for citations.
create or replace function match_knowledge (
  query_embedding vector(768),
  match_count     int default 6,
  filter_locale   locale default null,
  min_similarity  float default 0.0
)
returns table (
  id           uuid,
  procedure_id uuid,
  source_kind  text,
  locale       locale,
  content      text,
  similarity   float
)
language sql
stable
as $$
  select
    kc.id,
    kc.procedure_id,
    kc.source_kind,
    kc.locale,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where kc.embedding is not null
    and (filter_locale is null or kc.locale = filter_locale)
    and (1 - (kc.embedding <=> query_embedding)) >= min_similarity
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- =============================================================================
-- 5. Citizen engagement
-- =============================================================================

-- Bookmarked procedures (signed-in users).
create table saved_procedures (
  user_id      uuid not null references profiles (id) on delete cascade,
  procedure_id uuid not null references procedures (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, procedure_id)
);

-- Per-step checklist progress, synced across a user's devices.
create table user_step_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles (id) on delete cascade,
  procedure_id uuid not null references procedures (id) on delete cascade,
  step_id      uuid not null references procedure_steps (id) on delete cascade,
  status       progress_status not null default 'pending',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, step_id)
);
create index idx_progress_user on user_step_progress (user_id, procedure_id);
create trigger trg_progress_updated_at
  before update on user_step_progress
  for each row execute function set_updated_at();

-- Conversations. user_id is nullable so anonymous sessions are first-class.
create table chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles (id) on delete set null,
  locale      locale not null default 'en',
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_sessions_user on chat_sessions (user_id);
create trigger trg_sessions_updated_at
  before update on chat_sessions
  for each row execute function set_updated_at();

create table chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references chat_sessions (id) on delete cascade,
  role                chat_role not null,
  content             text not null,
  procedure_id        uuid references procedures (id) on delete set null,  -- resolved procedure, if any
  retrieved_chunk_ids uuid[] not null default '{}',                        -- citations / audit
  model               text,
  prompt_tokens       int,
  completion_tokens   int,
  latency_ms          int,
  created_at          timestamptz not null default now()
);
create index idx_messages_session on chat_messages (session_id, created_at);

create table message_feedback (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references chat_messages (id) on delete cascade,
  user_id     uuid references profiles (id) on delete set null,
  rating      smallint not null check (rating in (-1, 1)),   -- thumbs down / up
  comment     text,
  created_at  timestamptz not null default now(),
  unique (message_id, user_id)
);

-- =============================================================================
-- 6. Analytics (content-gap analysis)
-- =============================================================================
-- Every query is logged so the data team can see what citizens ask that the
-- catalog does not yet cover (had_answer = false) and prioritise new procedures.

create table search_queries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references profiles (id) on delete set null,
  session_id          uuid references chat_sessions (id) on delete set null,
  raw_query           text not null,
  detected_locale     locale,
  matched_procedure_id uuid references procedures (id) on delete set null,
  result_count        int not null default 0,
  had_answer          boolean not null default false,
  created_at          timestamptz not null default now()
);
create index idx_queries_created   on search_queries (created_at desc);
create index idx_queries_no_answer on search_queries (had_answer) where had_answer = false;

-- =============================================================================
-- 7. Row Level Security
-- =============================================================================

alter table profiles            enable row level security;
alter table categories          enable row level security;
alter table institutions        enable row level security;
alter table procedures          enable row level security;
alter table procedure_steps     enable row level security;
alter table required_documents  enable row level security;
alter table fees                enable row level security;
alter table procedure_revisions enable row level security;
alter table knowledge_chunks    enable row level security;
alter table saved_procedures    enable row level security;
alter table user_step_progress  enable row level security;
alter table chat_sessions       enable row level security;
alter table chat_messages       enable row level security;
alter table message_feedback    enable row level security;
alter table search_queries      enable row level security;

-- --- profiles: a user sees/edits own row; admins see all; role is admin-only ---
create policy profiles_select_self on profiles
  for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on profiles
  for all using (is_admin()) with check (is_admin());

-- --- catalog: everyone reads; only staff write ---
create policy categories_read   on categories   for select using (true);
create policy categories_write  on categories   for all using (is_staff()) with check (is_staff());
create policy institutions_read on institutions for select using (true);
create policy institutions_write on institutions for all using (is_staff()) with check (is_staff());

-- --- procedures & children: anon/citizen read PUBLISHED only; staff read/write all --
create policy procedures_read_published on procedures
  for select using (status = 'published' or is_staff());
create policy procedures_write on procedures
  for all using (is_staff()) with check (is_staff());

create policy steps_read on procedure_steps
  for select using (
    exists (select 1 from procedures p
            where p.id = procedure_id and (p.status = 'published' or is_staff()))
  );
create policy steps_write on procedure_steps
  for all using (is_staff()) with check (is_staff());

create policy docs_read on required_documents
  for select using (
    exists (select 1 from procedures p
            where p.id = procedure_id and (p.status = 'published' or is_staff()))
  );
create policy docs_write on required_documents
  for all using (is_staff()) with check (is_staff());

create policy fees_read on fees
  for select using (
    exists (select 1 from procedures p
            where p.id = procedure_id and (p.status = 'published' or is_staff()))
  );
create policy fees_write on fees
  for all using (is_staff()) with check (is_staff());

-- --- revisions & knowledge chunks: staff-only via the anon/auth API ---
-- (the embed job runs with the service role, which bypasses RLS)
create policy revisions_staff on procedure_revisions
  for all using (is_staff()) with check (is_staff());
create policy chunks_staff on knowledge_chunks
  for all using (is_staff()) with check (is_staff());

-- --- engagement: each user only their own rows ---
create policy saved_own on saved_procedures
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_own on user_step_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- chat sessions/messages: owned by the signed-in user; anonymous rows (user_id null)
-- are reached only through the service role on the server, never the anon key.
create policy sessions_own on chat_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy messages_own on chat_messages
  for all using (
    exists (select 1 from chat_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from chat_sessions s
            where s.id = session_id and s.user_id = auth.uid())
  );
create policy feedback_own on message_feedback
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- search_queries: staff read for analytics; inserts happen server-side (service role).
create policy queries_staff_read on search_queries
  for select using (is_staff());

-- =============================================================================
-- 8. Seed reference data (institutions + categories for the first procedures)
-- =============================================================================

insert into institutions (slug, kind, name_en) values
  ('police',                 'police',                 'Sri Lanka Police'),
  ('grama-niladhari',        'grama_niladhari',        'Grama Niladhari'),
  ('divisional-secretariat', 'divisional_secretariat', 'Divisional Secretariat'),
  ('drp',                    'drp',                    'Department for Registration of Persons'),
  ('dmt',                    'dmt',                    'Department of Motor Traffic'),
  ('municipal-council',      'municipal_council',      'Municipal Council'),
  ('water-board',            'water_board',            'National Water Supply & Drainage Board'),
  ('ceb',                    'utility',                'Ceylon Electricity Board')
on conflict (slug) do nothing;

insert into categories (slug, name_en, sort_order) values
  ('national-id', 'National Identity Card', 10),
  ('passport',    'Passport',               20),
  ('vehicles',    'Vehicles & Licensing',   30),
  ('utilities',   'Water & Electricity',    40),
  ('civil',       'Births, Marriages & Deaths', 50),
  ('local-gov',   'Municipal & Local Government', 60)
on conflict (slug) do nothing;
