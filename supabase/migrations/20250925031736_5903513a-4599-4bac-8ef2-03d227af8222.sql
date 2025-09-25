-- Create similarity search function using pgvector (fixed parameter naming)
CREATE OR REPLACE FUNCTION similarity_search(
  query_embedding vector(384),
  kb_id text,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  knowledge_base_id text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kbc.id,
    kbc.chunk_text,
    kbc.knowledge_base_id,
    1 - (kbc.embedding <=> query_embedding) as similarity
  FROM knowledge_base_chunks kbc
  WHERE kbc.knowledge_base_id = kb_id
  ORDER BY kbc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;