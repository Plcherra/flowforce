-- Phase 1: Database Schema Updates for Form Field Elements

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

-- Create storage buckets for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('form-images', 'form-images', false),
  ('form-videos', 'form-videos', false),
  ('form-audio', 'form-audio', false),
  ('form-signatures', 'form-signatures', false),
  ('form-files', 'form-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for form media uploads
-- Form Images
CREATE POLICY "Users can upload form images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'form-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view form images they uploaded" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Form creators can view submission images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-images' AND 
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE f.created_by = auth.uid() 
      AND fs.id::text = (storage.foldername(name))[2]
    )
  );

-- Form Videos
CREATE POLICY "Users can upload form videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'form-videos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view form videos they uploaded" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-videos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Form creators can view submission videos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-videos' AND 
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE f.created_by = auth.uid() 
      AND fs.id::text = (storage.foldername(name))[2]
    )
  );

-- Form Audio
CREATE POLICY "Users can upload form audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'form-audio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view form audio they uploaded" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-audio' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Form creators can view submission audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-audio' AND 
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE f.created_by = auth.uid() 
      AND fs.id::text = (storage.foldername(name))[2]
    )
  );

-- Form Signatures
CREATE POLICY "Users can upload form signatures" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'form-signatures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view form signatures they uploaded" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-signatures' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Form creators can view submission signatures" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-signatures' AND 
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE f.created_by = auth.uid() 
      AND fs.id::text = (storage.foldername(name))[2]
    )
  );

-- Form Files
CREATE POLICY "Users can upload form files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'form-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view form files they uploaded" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Form creators can view submission files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-files' AND 
    EXISTS (
      SELECT 1 FROM form_submissions fs
      JOIN forms f ON f.id = fs.form_id
      WHERE f.created_by = auth.uid() 
      AND fs.id::text = (storage.foldername(name))[2]
    )
  );

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

-- Create function to calculate formula fields
CREATE OR REPLACE FUNCTION calculate_formula_field(
  formula_expr TEXT,
  submission_data JSONB
) RETURNS DECIMAL
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result DECIMAL;
  field_key TEXT;
  field_value DECIMAL;
  processed_formula TEXT;
BEGIN
  processed_formula := formula_expr;
  
  -- Simple formula processing (can be extended)
  -- Replace field references with actual values
  FOR field_key IN SELECT jsonb_object_keys(submission_data)
  LOOP
    IF submission_data->>field_key ~ '^[0-9]+\.?[0-9]*$' THEN
      field_value := (submission_data->>field_key)::DECIMAL;
      processed_formula := replace(processed_formula, '{' || field_key || '}', field_value::TEXT);
    END IF;
  END LOOP;
  
  -- Basic arithmetic evaluation (extend as needed)
  -- This is a simplified version - in production, use a proper expression evaluator
  BEGIN
    EXECUTE 'SELECT ' || processed_formula INTO result;
    RETURN result;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;