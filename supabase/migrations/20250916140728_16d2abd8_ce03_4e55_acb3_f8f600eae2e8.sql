-- Phase 1: Core Database Schema Updates for Form Field Elements (Part 1)

-- First, let's see the current field_type enum and extend it
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'formula';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'slider';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'boolean';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'location';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'image';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'audio';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'signature';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'rating';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'scanner';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'task';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'image_selection';

-- Create storage buckets for media uploads (only if they don't exist)
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('form-images', 'form-images', false),
  ('form-videos', 'form-videos', false),
  ('form-audio', 'form-audio', false),
  ('form-signatures', 'form-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for form field location data
CREATE TABLE IF NOT EXISTS form_field_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(10, 2),
  accuracy DECIMAL(10, 2),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(field_id, submission_id)
);

-- Enable RLS on location data
ALTER TABLE form_field_locations ENABLE ROW LEVEL SECURITY;

-- Location data policies
CREATE POLICY "Users can insert location data for their submissions" ON form_field_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_submissions 
      WHERE id = submission_id AND submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can view location data for accessible submissions" ON form_field_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE fs.id = submission_id 
      AND (fs.submitted_by = auth.uid() OR f.created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
    )
  );

-- Create table for form field signature data
CREATE TABLE IF NOT EXISTS form_field_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 encoded signature
  signature_url TEXT, -- Storage URL for signature image
  signer_name TEXT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(field_id, submission_id)
);

-- Enable RLS on signature data
ALTER TABLE form_field_signatures ENABLE ROW LEVEL SECURITY;

-- Signature data policies
CREATE POLICY "Users can insert signature data for their submissions" ON form_field_signatures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_submissions 
      WHERE id = submission_id AND submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can view signature data for accessible submissions" ON form_field_signatures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE fs.id = submission_id 
      AND (fs.submitted_by = auth.uid() OR f.created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
    )
  );

-- Create table for form field rating data
CREATE TABLE IF NOT EXISTS form_field_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  rating_value INTEGER NOT NULL,
  max_rating INTEGER DEFAULT 5,
  rating_type TEXT DEFAULT 'stars', -- 'stars', 'numeric', 'emoji'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(field_id, submission_id)
);

-- Enable RLS on rating data
ALTER TABLE form_field_ratings ENABLE ROW LEVEL SECURITY;

-- Rating data policies
CREATE POLICY "Users can insert rating data for their submissions" ON form_field_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_submissions 
      WHERE id = submission_id AND submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can view rating data for accessible submissions" ON form_field_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE fs.id = submission_id 
      AND (fs.submitted_by = auth.uid() OR f.created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
    )
  );

-- Create table for form field scanner data (barcodes/QR codes)
CREATE TABLE IF NOT EXISTS form_field_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  field_id UUID NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  scan_data TEXT NOT NULL, -- The scanned code/data
  scan_type TEXT NOT NULL, -- 'barcode', 'qr_code', etc.
  scan_format TEXT, -- Code format (EAN-13, Code 128, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(field_id, submission_id)
);

-- Enable RLS on scan data
ALTER TABLE form_field_scans ENABLE ROW LEVEL SECURITY;

-- Scan data policies
CREATE POLICY "Users can insert scan data for their submissions" ON form_field_scans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM form_submissions 
      WHERE id = submission_id AND submitted_by = auth.uid()
    )
  );

CREATE POLICY "Users can view scan data for accessible submissions" ON form_field_scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE fs.id = submission_id 
      AND (fs.submitted_by = auth.uid() OR f.created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_field_locations_submission ON form_field_locations(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_field_signatures_submission ON form_field_signatures(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_field_ratings_submission ON form_field_ratings(submission_id);
CREATE INDEX IF NOT EXISTS idx_form_field_scans_submission ON form_field_scans(submission_id);

-- Update form_fields table to support new validation rules
ALTER TABLE form_fields 
ADD COLUMN IF NOT EXISTS min_value DECIMAL,
ADD COLUMN IF NOT EXISTS max_value DECIMAL,
ADD COLUMN IF NOT EXISTS step_value DECIMAL DEFAULT 1,
ADD COLUMN IF NOT EXISTS formula_expression TEXT,
ADD COLUMN IF NOT EXISTS dependent_fields JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS rating_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS scan_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS media_config JSONB DEFAULT '{}';