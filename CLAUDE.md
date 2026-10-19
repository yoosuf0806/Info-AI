# InfoAI.LK — AI assistant for Sri Lankan government & legal processes

Citizens ask questions in natural language (English / සිංහල / தமிழ්) and get
answers composed **only** from official content entered by authorized officers,
with source citations. It is a strict **RAG** system — Gemini answers only from
retrieved database content, never from its own world knowledge. When nothing
relevant is found, it says so and points to the Government Information Centre
(**1919**).

See [`README.md`](./README.md) for setup, [`docs/architecture.md`](./docs/architecture.md)
for how the system fits together, and [`docs/data-model.md`](./docs/data-model.md)
for the database.

## Stack

- **Frontend / hosting:** Next.js (App Router) + Tailwind, on Vercel.
- **DB & auth:** Supabase (Postgres + `pgvector`); Supabase Auth for officers.
- **LLM:** Google Gemini — Flash tier for answering; `gemini-embedding-001`
  embeddings, L2-normalized to **768** dims.
- **Files:** Supabase Storage, private `documents` bucket.

## Core principle: answer only from retrieved government content

`/api/ask` (`src/lib/rag/answer.ts`): embed the question → `match_procedure_chunks`
over **published** procedures only → generate under a strict context-only prompt →
return citations (department + last-verified date). No retrieval above
`RAG_MATCH_THRESHOLD` ⇒ the "no information / 1919" fallback; the model is **not**
asked to improvise. Never invent fees, timelines, or legal steps, and never move
answering to the model's own knowledge or to the browser.

## Things worth knowing before changing them

- **Trilingual by translation, not columns.** A procedure has one `body` in its
  `authoring_language`; other languages are machine-translated at answer time
  unless an officer-verified `procedure_translations` row exists (which wins).
  Machine-translated answers carry the `autoTranslated` notice.
- **Fees and timeline are free text** on `procedures`, not structured rows.
- **Only published procedures are retrievable** — enforced by RLS *and* inside
  `match_procedure_chunks`. Don't weaken either.
- **Embedding dimension is pinned to 768.** It must match in `vector(768)`
  (`0001_init.sql`) and `GEMINI_EMBEDDING_DIM`; changing it means re-embedding all
  published procedures.
- **Publishing re-embeds.** `src/lib/rag/index-procedure.ts` chunks + embeds on
  publish. Seeded procedures (`0004_seed.sql`) have no embeddings until
  `POST /api/admin/reindex` or a re-save.
- **Trust split is in the DB.** Citizens are `anon` (read published, insert a
  query, attach feedback); officers are `authenticated` (manage content); the
  server uses the service role (bypasses RLS) for retrieval and privileged writes.
  Roles are flat — every authenticated user is an officer. `/admin` and
  `/api/admin` are guarded by `src/middleware.ts`.
- **Secrets stay server-side.** Only `NEXT_PUBLIC_*` reaches the browser.

## Migrations

Numbered SQL in `supabase/migrations/`, applied in order `0001`→`0005`
(`supabase db push`). `0001` tables, `0002` RLS, `0003` `match_procedure_chunks`,
`0004` seed, `0005` Storage bucket.

## Not this repo

Unrelated to `go-website` (the Golden Oven storefront) — different Supabase
project, domain, and data model.
