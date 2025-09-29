-- Fix coordinate field overflow by expanding numeric precision
-- Change from NUMERIC(10,8) to NUMERIC(12,8) to accommodate Indonesian coordinates
ALTER TABLE hazard_reports 
ALTER COLUMN latitude TYPE NUMERIC(12,8),
ALTER COLUMN longitude TYPE NUMERIC(12,8);