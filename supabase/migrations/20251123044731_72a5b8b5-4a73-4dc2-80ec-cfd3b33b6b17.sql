-- System configurations table for storing all configurable parameters
CREATE TABLE IF NOT EXISTS system_configurations (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  value JSONB NOT NULL,
  default_value JSONB NOT NULL,
  value_type TEXT NOT NULL,
  unit TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  is_visible BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "System configurations are publicly readable"
  ON system_configurations FOR SELECT
  TO public
  USING (true);

-- Public write access
CREATE POLICY "System configurations are publicly updatable"
  ON system_configurations FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default configurations
INSERT INTO system_configurations (id, category, name, description, value, default_value, value_type, unit, min_value, max_value) VALUES
-- Similarity Detection Parameters
('similarity_time_window', 'similarity', 'Time Window for Similarity Check', 'Berapa hari ke belakang untuk mencari laporan serupa', '7'::jsonb, '7'::jsonb, 'number', 'days', 1, 30),
('similarity_location_radius', 'similarity', 'Location Radius Threshold', 'Radius maksimal untuk dianggap lokasi yang sama', '1.0'::jsonb, '1.0'::jsonb, 'number', 'km', 0.1, 10),
('similarity_threshold', 'similarity', 'Overall Similarity Threshold', 'Minimum score untuk dianggap mirip (0-1)', '0.7'::jsonb, '0.7'::jsonb, 'number', 'score', 0, 1),
('similarity_top_n', 'similarity', 'Max Similar Reports to Show', 'Maksimal jumlah laporan serupa yang ditampilkan', '5'::jsonb, '5'::jsonb, 'number', 'reports', 1, 20),
('similarity_weights', 'similarity', 'Similarity Calculation Weights', 'Bobot untuk setiap faktor similarity (total harus = 1.0)', 
  '{"location_radius": 0.22, "location_name": 0.18, "detail_location": 0.14, "location_description": 0.09, "non_compliance": 0.14, "sub_non_compliance": 0.09, "finding_description": 0.14}'::jsonb,
  '{"location_radius": 0.22, "location_name": 0.18, "detail_location": 0.14, "location_description": 0.09, "non_compliance": 0.14, "sub_non_compliance": 0.09, "finding_description": 0.14}'::jsonb,
  'object', null, null, null),

-- RAG/AI Model Parameters
('rag_top_k', 'ai_model', 'RAG Top K Chunks', 'Jumlah dokumen paling relevan yang diambil dari knowledge base', '3'::jsonb, '3'::jsonb, 'number', 'chunks', 1, 10),
('rag_model', 'ai_model', 'RAG Analysis Model', 'Model AI untuk analisis RAG', '"gemini-2.5-flash-lite"'::jsonb, '"gemini-2.5-flash-lite"'::jsonb, 'string', null, null, null),
('rag_temperature', 'ai_model', 'RAG Temperature', 'Temperature untuk generation (0 = deterministik, 1 = kreatif)', '0.1'::jsonb, '0.1'::jsonb, 'number', null, 0, 1),
('rag_max_tokens', 'ai_model', 'RAG Max Output Tokens', 'Maksimal token output dari AI', '3072'::jsonb, '3072'::jsonb, 'number', 'tokens', 512, 8192),

-- Scoring Parameters
('scoring_model', 'scoring', 'Scoring Model', 'Model AI untuk quality scoring', '"gemini-2.5-flash"'::jsonb, '"gemini-2.5-flash"'::jsonb, 'string', null, null, null),
('scoring_temperature', 'scoring', 'Scoring Temperature', 'Temperature untuk scoring analysis', '0.3'::jsonb, '0.3'::jsonb, 'number', null, 0, 1),
('scoring_weights', 'scoring', 'Scoring Category Weights', 'Bobot untuk Consistency, Completeness, Image Relevance',
  '{"consistency": 0.33, "completeness": 0.33, "image_relevance": 0.34}'::jsonb,
  '{"consistency": 0.33, "completeness": 0.33, "image_relevance": 0.34}'::jsonb,
  'object', null, null, null),

-- Investigation Report Parameters
('investigation_model', 'ai_model', 'Investigation Report Model', 'Model AI untuk generate investigation report', '"gemini-2.0-flash"'::jsonb, '"gemini-2.0-flash"'::jsonb, 'string', null, null, null),
('investigation_temperature', 'ai_model', 'Investigation Temperature', 'Temperature untuk investigation report generation', '0.3'::jsonb, '0.3'::jsonb, 'number', null, 0, 1),
('investigation_max_tokens', 'ai_model', 'Investigation Max Tokens', 'Max tokens untuk investigation report', '8000'::jsonb, '8000'::jsonb, 'number', 'tokens', 2000, 16000);

-- Create index for faster lookups
CREATE INDEX idx_system_configurations_category ON system_configurations(category);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_system_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_configurations_updated_at
  BEFORE UPDATE ON system_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_system_configurations_updated_at();