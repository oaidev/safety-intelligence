-- Add location pinpoint fields to hazard_reports table
ALTER TABLE hazard_reports 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_hazard_reports_location_coords 
ON hazard_reports (latitude, longitude);

-- Add new status options and remove UNDER_EVALUATION
-- Update any existing UNDER_EVALUATION records to PENDING_REVIEW
UPDATE hazard_reports 
SET status = 'PENDING_REVIEW' 
WHERE status = 'UNDER_EVALUATION';

-- Add function to calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL(10,8), 
  lon1 DECIMAL(10,8), 
  lat2 DECIMAL(10,8), 
  lon2 DECIMAL(10,8)
) RETURNS DECIMAL(10,3) AS $$
DECLARE
  R DECIMAL := 6371; -- Earth's radius in kilometers
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  -- Convert degrees to radians
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  
  -- Haversine formula
  a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2) * SIN(dlon/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;