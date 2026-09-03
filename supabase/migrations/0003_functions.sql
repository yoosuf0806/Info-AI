-- =============================================================================
-- InfoAI.LK — RAG retrieval function
--
-- match_procedure_chunks: cosine-similarity vector search over chunks whose
-- parent procedure is PUBLISHED. Returns similarity in [0..1] (1 - cosine
-- distance) so the app can apply a relevance threshold.
-- =============================================================================

create or replace function match_procedure_chunks(
  query_embedding vector(768),
  match_count     int default 6,
  match_threshold float default 0.6
)
returns table (
  chunk_id          uuid,
  procedure_id      uuid,
  chunk_index       int,
  chunk_text        text,
  similarity        float,
  procedure_title   text,
  source_department text,
  fees              text,
  timeline          text,
  authoring_language language_code,
  last_verified_date date,
  category_id       uuid
)
language sql stable
as $$
  select
    c.id            as chunk_id,
    c.procedure_id,
    c.chunk_index,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) as similarity,
    p.title         as procedure_title,
    p.source_department,
    p.fees,
    p.timeline,
    p.authoring_language,
    p.last_verified_date,
    p.category_id
  from procedure_chunks c
  join procedures p on p.id = c.procedure_id
  where p.status = 'published'
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding asc
  limit match_count;
$$;
