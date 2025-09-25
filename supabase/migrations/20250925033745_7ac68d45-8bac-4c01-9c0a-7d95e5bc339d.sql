-- Fix security issues: Set search_path for functions

-- Drop and recreate similarity_search_hybrid function with proper search_path
DROP FUNCTION IF EXISTS public.similarity_search_hybrid(vector, text, integer, text);

CREATE OR REPLACE FUNCTION public.similarity_search_hybrid(
  query_embedding vector, 
  kb_id text, 
  match_count integer DEFAULT 3,
  provider text DEFAULT 'client-side'
)
RETURNS TABLE(id uuid, chunk_text text, knowledge_base_id text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF provider = 'google' THEN
    RETURN QUERY
    SELECT 
      kbc.id,
      kbc.chunk_text,
      kbc.knowledge_base_id,
      1 - (kbc.google_embedding <=> query_embedding) as similarity
    FROM knowledge_base_chunks kbc
    WHERE kbc.knowledge_base_id = kb_id AND kbc.google_embedding IS NOT NULL
    ORDER BY kbc.google_embedding <=> query_embedding
    LIMIT match_count;
  ELSE
    RETURN QUERY
    SELECT 
      kbc.id,
      kbc.chunk_text,
      kbc.knowledge_base_id,
      1 - (kbc.client_embedding <=> query_embedding) as similarity
    FROM knowledge_base_chunks kbc
    WHERE kbc.knowledge_base_id = kb_id AND kbc.client_embedding IS NOT NULL
    ORDER BY kbc.client_embedding <=> query_embedding
    LIMIT match_count;
  END IF;
END;
$$;