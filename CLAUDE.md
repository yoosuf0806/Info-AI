# Info-AI.LK — AI assistant for Sri Lankan civic procedures

A centralized, trilingual (Sinhala / Tamil / English) platform that answers
citizens' questions about government procedures — NIC, passport, vehicle licensing,
water/electricity connections, Grama Niladhari forms — and renders each answer as a
trackable **step timeline** with a **document checklist**, not a wall of text.

## Architecture (see `docs/architecture.md`)

- **Frontend / hosting:** Next.js on Vercel (SSR + ISR, edge-cached public guides).
- **Database & auth:** Supabase (PostgreSQL) with `pgvector` for embeddings, RLS for roles.
- **RAG:** query → embed (Gemini `text-embedding-004`, 768-dim) → `match_knowledge()`
  similarity search → Gemini generation, grounded strictly in retrieved content + citations.
- **CMS:** admin portal in the same app; editors update fees/forms without code changes;
  publishing re-embeds the affected content.

## Core principle: the LLM presents, it does not invent

Fees, steps and required documents are **relational rows** authored by humans
(`procedures`, `procedure_steps`, `required_documents`, `fees`). The UI renders the
timeline and checklist from those rows. The LLM only re-states retrieved content and
always cites the source procedure. Never move authority for fees/steps into free text
or the browser.

## Data model (see `docs/data-model.md`, schema in `supabase/migrations/0001_init.sql`)

- Trilingual authored text uses `_en` / `_si` / `_ta` columns; English is required,
  si/ta fall back to English.
- Money is integer `amount_cents` (LKR) — never floats.
- Only `published` procedures are readable by anonymous/citizen roles (RLS).
- `is_staff()` / `is_admin()` (security-definer) gate all catalog writes.
- Numbered SQL migrations in `supabase/migrations/`; apply with `supabase db push`.

## Not in this repo

This is unrelated to `go-website` (the Golden Oven storefront). Different Supabase
project, domain, and data model — share nothing between them.
