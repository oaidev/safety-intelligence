-- Create hazard reports table for the dual-flow system
CREATE TABLE public.hazard_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Reporter Information
  reporter_name TEXT NOT NULL,
  reporter_position TEXT,
  reporter_company TEXT,
  
  -- Location Details
  site TEXT,
  location TEXT NOT NULL,
  detail_location TEXT,
  location_description TEXT,
  
  -- PJA Information
  area_pja_bc TEXT,
  pja_mitra_kerja TEXT,
  
  -- Hazard Details
  observation_tool TEXT,
  non_compliance TEXT NOT NULL,
  sub_non_compliance TEXT NOT NULL,
  quick_action TEXT NOT NULL,
  finding_description TEXT NOT NULL,
  
  -- Image Storage
  image_url TEXT,
  image_base64 TEXT,
  
  -- Status and Workflow
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  tracking_id TEXT UNIQUE NOT NULL DEFAULT 'HR-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(EXTRACT(DOY FROM NOW())::TEXT, 3, '0') || '-' || LPAD((EXTRACT(HOUR FROM NOW()) * 3600 + EXTRACT(MINUTE FROM NOW()) * 60 + EXTRACT(SECOND FROM NOW()))::INTEGER::TEXT, 5, '0'),
  
  -- Evaluation Fields
  kategori_temuan TEXT,
  root_cause_analysis TEXT,
  corrective_actions TEXT,
  preventive_measures TEXT,
  risk_level TEXT,
  
  -- Follow-up Management
  konfirmasi TEXT,
  jenis_tindakan TEXT,
  alur_permasalahan TEXT,
  tindakan TEXT,
  due_date_perbaikan DATE,
  
  -- AI Analysis Results (stored as JSONB for flexibility)
  ai_analysis JSONB,
  similarity_cluster_id UUID,
  
  -- Evaluation tracking
  evaluated_by UUID REFERENCES auth.users(id),
  evaluated_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hazard_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since both frontliner and evaluator roles use the same table)
CREATE POLICY "Hazard reports are publicly readable" 
ON public.hazard_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Hazard reports are publicly writable" 
ON public.hazard_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Hazard reports are publicly updatable" 
ON public.hazard_reports 
FOR UPDATE 
USING (true);

-- Create action items table for tracking corrective actions
CREATE TABLE public.hazard_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hazard_report_id UUID NOT NULL REFERENCES public.hazard_reports(id) ON DELETE CASCADE,
  jenis_tindakan TEXT NOT NULL,
  alur_permasalahan TEXT NOT NULL,
  tindakan TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  assigned_to TEXT,
  priority_level TEXT DEFAULT 'MEDIUM',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for action items
ALTER TABLE public.hazard_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Action items are publicly accessible" 
ON public.hazard_action_items 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_hazard_reports_status ON public.hazard_reports(status);
CREATE INDEX idx_hazard_reports_created_at ON public.hazard_reports(created_at);
CREATE INDEX idx_hazard_reports_location ON public.hazard_reports(location);
CREATE INDEX idx_hazard_reports_non_compliance ON public.hazard_reports(non_compliance);
CREATE INDEX idx_hazard_reports_similarity_cluster ON public.hazard_reports(similarity_cluster_id);
CREATE INDEX idx_hazard_action_items_hazard_report ON public.hazard_action_items(hazard_report_id);
CREATE INDEX idx_hazard_action_items_status ON public.hazard_action_items(status);

-- Create trigger for updating timestamps
CREATE TRIGGER update_hazard_reports_updated_at
BEFORE UPDATE ON public.hazard_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
BEFORE UPDATE ON public.hazard_action_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();