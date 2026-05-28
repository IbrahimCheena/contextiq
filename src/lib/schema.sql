-- ContextIQ — Phase 2 schema
-- Run this once in the Supabase SQL editor before using the upload pipeline.

-- 1. Enable the pgvector extension (already available on Supabase).
create extension if not exists vector;

-- 2. Documents table.
--    Each row is one 500-token chunk from an uploaded file.
create table if not exists documents (
  id          uuid        primary key default gen_random_uuid(),
  filename    text        not null,
  chunk_index integer     not null,
  content     text        not null,
  embedding   vector(1536) not null,
  created_at  timestamptz not null default now()
);

-- 3. IVFFlat index for fast approximate cosine-similarity search.
--    lists = 100 is a safe default for datasets up to ~1 M rows.
--    Re-run ANALYZE after bulk-loading data so the planner uses the index.
--    NOTE: pgvector requires at least one row to exist before the index can
--    be probed; the planner falls back to a sequential scan on empty tables.
create index if not exists documents_embedding_idx
  on documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 4. match_documents — semantic similarity search used in Phase 3.
--    Returns the top `match_count` chunks ordered by cosine similarity.
--    Similarity = 1 − cosine_distance, so 1.0 is identical, 0.0 is orthogonal.
create or replace function match_documents(
  query_embedding vector(1536),
  match_count     integer default 5
)
returns table (
  id          uuid,
  filename    text,
  chunk_index integer,
  content     text,
  similarity  float
)
language sql stable
as $$
  select
    id,
    filename,
    chunk_index,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from documents
  order by embedding <=> query_embedding
  limit match_count;
$$;
