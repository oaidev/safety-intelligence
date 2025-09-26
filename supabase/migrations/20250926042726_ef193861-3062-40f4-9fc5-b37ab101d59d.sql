-- Fix security warnings for function search path
-- Set search_path for the similarity_search function
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
    1 - (kbc.embedding <=> query_embedding) as similarity
  FROM knowledge_base_chunks kbc
  WHERE kbc.knowledge_base_id = kb_id
  ORDER BY kbc.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;