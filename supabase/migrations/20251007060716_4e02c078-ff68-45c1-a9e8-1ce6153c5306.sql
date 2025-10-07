-- Add UPDATE, INSERT, DELETE policies for knowledge_bases table
-- This fixes the issue where Prompt Template Editor and Knowledge Base Management cannot save to database

CREATE POLICY "Knowledge bases are publicly updatable"
ON public.knowledge_bases FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Knowledge bases are publicly insertable"
ON public.knowledge_bases FOR INSERT
WITH CHECK (true);

CREATE POLICY "Knowledge bases are publicly deletable"
ON public.knowledge_bases FOR DELETE
USING (true);