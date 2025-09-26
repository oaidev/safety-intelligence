-- Create bulk import jobs table for tracking progress
CREATE TABLE IF NOT EXISTS public.bulk_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id TEXT NOT NULL,
  kb_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed', 'paused'
  total_rows INTEGER NOT NULL DEFAULT 0,
  processed_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  error_log JSONB DEFAULT '[]'::jsonb,
  operation_type TEXT NOT NULL DEFAULT 'create', -- 'create', 'replace', 'append'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for bulk import jobs (public access for this demo)
CREATE POLICY "Bulk import jobs are publicly readable" 
ON public.bulk_import_jobs 
FOR SELECT 
USING (true);

CREATE POLICY "Bulk import jobs are publicly writable" 
ON public.bulk_import_jobs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Bulk import jobs are publicly updatable" 
ON public.bulk_import_jobs 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_bulk_import_jobs_updated_at
BEFORE UPDATE ON public.bulk_import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_status ON public.bulk_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_kb_id ON public.bulk_import_jobs(kb_id);