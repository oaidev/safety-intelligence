-- Fix dimension mismatch for client_embedding column
-- Update client_embedding to use 384 dimensions to match HuggingFace model
ALTER TABLE knowledge_base_chunks 
ALTER COLUMN client_embedding TYPE vector(384);

-- Clear all existing invalid embeddings to force repopulation
UPDATE knowledge_base_chunks 
SET client_embedding = NULL, google_embedding = NULL
WHERE client_embedding IS NOT NULL OR google_embedding IS NOT NULL;

-- Add index for better performance on client_embedding
CREATE INDEX IF NOT EXISTS idx_knowledge_base_chunks_client_embedding 
ON knowledge_base_chunks USING ivfflat (client_embedding vector_cosine_ops) 
WITH (lists = 100);