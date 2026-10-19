# InfoAI.LK

A Smart Digital Guide that helps Sri Lankan citizens navigate government and
legal processes. Citizens ask questions in natural language; the system answers
**only** from official government content entered by authorized officers, with
source citations.

This is a **RAG (Retrieval-Augmented Generation)** system. Gemini is never
fine-tuned — it answers strictly from content retrieved from the database. If no
relevant content is found, the system says so and points citizens to the
Government Information Centre (**1919**). It never answers from the model's own
world knowledge and never invents fees, timelines, or legal steps.

## Tech stack

| Layer        | Choice                                            |
|--------------|---------------------------------------------------|
| Frontend     | Next.js (App Router, React) + Tailwind CSS        |
| Hosting      | Vercel                                            |
| Backend / DB | Supabase (Postgres + `pgvector`)                  |
| Auth         | Supabase Auth (officers/admins only)              |
| LLM          | Google Gemini — Flash tier (answering)            |
| Embeddings   | Gemini embedding model (`gemini-embedding-001`)   |
| File storage | Supabase Storage (uploaded PDFs/DOCX)             |

## Architecture

```
Citizen (no login)                         Officer (Supabase Auth)
   │  question + language                     │  manage content / docs / categories
   ▼                                          ▼
/api/ask  ──► embed question (Gemini)     /admin/*  ──► /api/admin/* (officer-guarded)
          ──► match_procedure_chunks           │
              (pgvector, published only)        └─► on publish: chunk + embed → procedure_chunks
          ──► generate answer (Gemini,
              strict "context-only" prompt)
          ──► citations + auto-translated notice
          ──► log query (anonymous)
```

Key modules:

- `src/lib/rag/answer.ts` — end-to-end RAG (embed → retrieve → verified-translation
  override → generate → citations → log).
- `src/lib/rag/index-procedure.ts` — chunk + embed a procedure on publish/update.
- `src/lib/gemini/*` — Gemini client, embeddings (L2-normalized for 768 dims),
  and the strict answering prompt.
- `supabase/migrations/*` — schema, RLS, the `match_procedure_chunks` function,
  seed data, and the Storage bucket.

## Setup

### 1. Install

```bash
npm install
```

### 2. Supabase

1. Create a Supabase project. Note the project URL, `anon` key, and
   `service_role` key.
2. Run the migrations in order (SQL Editor or `supabase db push`):
   - `supabase/migrations/0001_init.sql` (extensions, tables, indexes)
   - `supabase/migrations/0002_rls.sql` (Row Level Security)
   - `supabase/migrations/0003_functions.sql` (`match_procedure_chunks`)
   - `supabase/migrations/0004_seed.sql` (categories + flagship NIC content)
   - `supabase/migrations/0005_storage.sql` (documents bucket + policies)
3. Create an officer login: Authentication → Users → Add user (email + password).
   All authenticated users are officers (flat role).

> **Embedding dimension** must match everywhere. The schema uses `vector(768)`
> and `GEMINI_EMBEDDING_DIM=768`. If you change one, change all and re-embed.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Set the same in
Vercel → Project → Settings → Environment Variables. Only `NEXT_PUBLIC_*` values
reach the browser; the Gemini key and Supabase service-role key stay server-side.

> **Verify Gemini model names** at <https://ai.google.dev/gemini-api/docs> — they
> change over time. Set `GEMINI_ANSWER_MODEL` and `GEMINI_EMBEDDING_MODEL`
> accordingly.

### 4. Embed the seed content

Seeded procedures are inserted directly and have no embeddings yet. After the
first officer signs in, re-embed all published procedures:

```bash
# with an officer session cookie, or from the browser dev console on /admin:
fetch('/api/admin/reindex', { method: 'POST' }).then(r => r.json()).then(console.log)
```

Re-saving/publishing any procedure in the admin UI also embeds it.

### 5. Run

```bash
npm run dev        # http://localhost:3000  (citizen app)
                   # http://localhost:3000/admin  (officer admin)
```

## Feature map (Phase 1)

- **Citizen app** (`/`): trilingual (EN / සිංහල / தமிழ්) question box + answer
  panel, citations (department + last-verified date), auto-translated notice,
  "no information" fallback (1919), suggested-question chips, 👍/👎 feedback.
- **Procedures** (`/admin/procedures`): create/edit/delete, draft vs published,
  fees, timeline, last-verified date, authoring language, verified translations;
  auto-embed on publish.
- **Documents / DMS** (`/admin/documents`): upload PDF/DOCX → text extraction,
  organize by category, search/filter, versioning, archive/restore.
- **Categories** (`/admin/categories`): add, rename, reorder, archive.
- **Suggested questions** (`/admin/suggested-questions`): curate citizen chips.
- **Feedback & insights** (`/admin/feedback`): 👎 answers and unanswered
  questions (content gaps).

## Guardrails (non-negotiable)

- Citizen answers come from retrieved government content only — never the model's
  own knowledge.
- No invented fees, timelines, or legal steps.
- Every answer cites its source and last-verified date.
- Only **published** procedures are retrievable (enforced by RLS and the RAG SQL
  function).
- Auto-translated legal content carries the translated notice unless a verified
  translation exists.
- Secrets stay server-side (API routes / server modules) — never sent to the
  browser.

## Phase 2 (deferred, designed for)

Interactive document checklist, "find nearest office" Maps links, printable
one-page summaries, and an analytics dashboard.
