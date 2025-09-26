-- Clear all old embeddings that have dimension mismatches
DELETE FROM knowledge_base_chunks WHERE client_embedding IS NOT NULL;

-- Also clear any google_embedding or embedding columns that might have old data
UPDATE knowledge_base_chunks SET google_embedding = NULL, embedding = NULL WHERE google_embedding IS NOT NULL OR embedding IS NOT NULL;