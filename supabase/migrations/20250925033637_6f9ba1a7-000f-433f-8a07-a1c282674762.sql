-- Fix RLS policies for knowledge_base_chunks to allow public insert operations
-- and add support for multiple embedding providers

-- Drop existing RLS policies for knowledge_base_chunks
DROP POLICY IF EXISTS "Knowledge base chunks are publicly viewable" ON public.knowledge_base_chunks;

-- Add new columns to support multiple embedding providers
ALTER TABLE public.knowledge_base_chunks 
ADD COLUMN IF NOT EXISTS embedding_provider text DEFAULT 'client-side',
ADD COLUMN IF NOT EXISTS google_embedding vector(384),
ADD COLUMN IF NOT EXISTS client_embedding vector(384);

-- Update existing embedding column to be client_embedding
UPDATE public.knowledge_base_chunks 
SET client_embedding = embedding, embedding_provider = 'client-side'
WHERE embedding IS NOT NULL AND client_embedding IS NULL;

-- Create new RLS policies that allow public read and write
CREATE POLICY "Knowledge base chunks are publicly readable" 
ON public.knowledge_base_chunks 
FOR SELECT 
USING (true);

CREATE POLICY "Knowledge base chunks are publicly writable" 
ON public.knowledge_base_chunks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Knowledge base chunks are publicly updatable" 
ON public.knowledge_base_chunks 
FOR UPDATE 
USING (true);

CREATE POLICY "Knowledge base chunks are publicly deletable" 
ON public.knowledge_base_chunks 
FOR DELETE 
USING (true);

-- Create index for better performance on embedding searches
CREATE INDEX IF NOT EXISTS idx_knowledge_base_chunks_google_embedding ON public.knowledge_base_chunks USING hnsw (google_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_chunks_client_embedding ON public.knowledge_base_chunks USING hnsw (client_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_chunks_provider ON public.knowledge_base_chunks(embedding_provider);

-- Update similarity search function to support different embedding providers
CREATE OR REPLACE FUNCTION public.similarity_search_hybrid(
  query_embedding vector, 
  kb_id text, 
  match_count integer DEFAULT 3,
  provider text DEFAULT 'client-side'
)
RETURNS TABLE(id uuid, chunk_text text, knowledge_base_id text, similarity double precision)
LANGUAGE plpgsql
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