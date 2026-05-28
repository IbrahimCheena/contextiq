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

-- 3. No ivfflat index for small datasets.
--    Without an index, pgvector performs an exact sequential scan which is
--    correct and fast for up to ~10 k rows.
--
--    Add an ivfflat index only after you have enough data:
--      CREATE INDEX documents_embedding_idx ON documents
--        USING ivfflat (embedding vector_cosine_ops)
--        WITH (lists = <sqrt(row_count)>);
--      ANALYZE documents;
--
--    If you already created the index on an empty table, drop it first:
--      DROP INDEX IF EXISTS documents_embedding_idx;

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
