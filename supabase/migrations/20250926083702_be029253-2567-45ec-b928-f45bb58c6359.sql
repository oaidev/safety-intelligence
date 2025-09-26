-- Fix the embedding dimension mismatch issue
-- The client-side model generates 384-dimensional vectors, but database expects 768

-- First, clear existing problematic data
DELETE FROM knowledge_base_chunks WHERE client_embedding IS NULL AND embedding IS NULL;

-- Update the embedding storage to use client_embedding column for 384-dimensional vectors
-- The populateKnowledgeBases function should store embeddings in client_embedding column instead of embedding column

-- Update the similarity search function to use client_embedding properly
CREATE OR REPLACE FUNCTION public.similarity_search(query_embedding vector, kb_id text, match_count integer DEFAULT 3)
RETURNS TABLE(id uuid, chunk_text text, knowledge_base_id text, similarity double precision)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
END;
$function$;