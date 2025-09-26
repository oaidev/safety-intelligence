-- Clear existing incompatible data and fix dimension mismatch
-- First, clear the existing data that has wrong dimensions
DELETE FROM knowledge_base_chunks;

-- Clear any incomplete bulk import jobs
DELETE FROM bulk_import_jobs WHERE status = 'processing';

-- Drop existing indexes
DROP INDEX IF EXISTS knowledge_base_chunks_embedding_idx;
DROP INDEX IF EXISTS knowledge_base_chunks_google_embedding_idx;
DROP INDEX IF EXISTS knowledge_base_chunks_client_embedding_idx;

-- Update vector columns to 768 dimensions (Google Gemini standard)
ALTER TABLE knowledge_base_chunks 
ALTER COLUMN embedding TYPE vector(768),
ALTER COLUMN google_embedding TYPE vector(768),
ALTER COLUMN client_embedding TYPE vector(768);

-- Recreate indexes with correct dimensions
CREATE INDEX knowledge_base_chunks_embedding_idx ON knowledge_base_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX knowledge_base_chunks_google_embedding_idx ON knowledge_base_chunks USING hnsw (google_embedding vector_cosine_ops);
CREATE INDEX knowledge_base_chunks_client_embedding_idx ON knowledge_base_chunks USING hnsw (client_embedding vector_cosine_ops);