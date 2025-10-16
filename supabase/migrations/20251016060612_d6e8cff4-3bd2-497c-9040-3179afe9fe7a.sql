-- Create investigation_reports table
CREATE TABLE investigation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text NOT NULL UNIQUE DEFAULT ('IR-' || EXTRACT(year FROM now()) || '-' || lpad(EXTRACT(doy FROM now())::text, 3, '0') || '-' || lpad((EXTRACT(hour FROM now()) * 3600 + EXTRACT(minute FROM now()) * 60 + EXTRACT(second FROM now()))::integer::text, 5, '0')),
  audio_file_name text NOT NULL,
  audio_duration_seconds integer,
  transcript text NOT NULL,
  report_content jsonb NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'FINALIZED')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE investigation_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Investigation reports are publicly readable"
  ON investigation_reports FOR SELECT
  USING (true);

CREATE POLICY "Investigation reports are publicly writable"
  ON investigation_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Investigation reports are publicly updatable"
  ON investigation_reports FOR UPDATE
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_investigation_reports_created_at ON investigation_reports(created_at DESC);
CREATE INDEX idx_investigation_reports_status ON investigation_reports(status);
CREATE INDEX idx_investigation_reports_tracking_id ON investigation_reports(tracking_id);