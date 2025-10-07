-- Phase 0 ingestion schema

-- Create enums
CREATE TYPE public.document_processing_state AS ENUM ('pending', 'processing', 'ready', 'error');
CREATE TYPE public.event_type AS ENUM ('incident', 'customer_complaint', 'prep_gap', 'policy_violation', 'other');
CREATE TYPE public.event_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.ooda_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
CREATE TYPE public.ooda_status AS ENUM ('open', 'closed');
CREATE TYPE public.task_source AS ENUM ('manual', 'from_report', 'auto');

-- Files table tracks raw uploads
CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploader_id uuid REFERENCES public.profiles(id),
  filename text NOT NULL,
  mime_type text,
  file_size bigint,
  storage_path text NOT NULL,
  checksum text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, storage_path)
);

-- Documents table stores parsed artifacts from files
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  title text,
  doc_date date,
  source text,
  language text,
  text_extracted text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_state public.document_processing_state NOT NULL DEFAULT 'pending',
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Events extracted from documents
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  event_type public.event_type NOT NULL,
  severity public.event_severity NOT NULL DEFAULT 'medium',
  occurred_at timestamptz,
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Operational cadence cycles for OODA reviews
CREATE TABLE public.ooda_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period public.ooda_period NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  status public.ooda_status NOT NULL DEFAULT 'open',
  owner_id uuid REFERENCES public.profiles(id),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ooda_cycles_valid_range CHECK (end_at IS NULL OR end_at >= start_at)
);

-- Extend tasks with ingestion metadata
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source public.task_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origin_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_files_company ON public.files(company_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company ON public.documents(company_id, doc_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_state ON public.documents(processing_state);
CREATE INDEX IF NOT EXISTS idx_events_company ON public.events(company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_ooda_cycles_company ON public.ooda_cycles(company_id, period, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_origin_event ON public.tasks(origin_event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_origin_document ON public.tasks(origin_document_id);

-- Updated_at triggers
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_ooda_cycles_updated_at
  BEFORE UPDATE ON public.ooda_cycles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS enablement
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ooda_cycles ENABLE ROW LEVEL SECURITY;

-- Policies for files
CREATE POLICY "company members can view files" ON public.files
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "company members can insert files" ON public.files
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "owners or admins can update files" ON public.files
  FOR UPDATE USING (
    company_id = public.get_user_company_id()
    AND (uploader_id = auth.uid() OR public.is_company_admin())
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
  );

CREATE POLICY "admins can delete files" ON public.files
  FOR DELETE USING (
    company_id = public.get_user_company_id() AND public.is_company_admin()
  );

-- Policies for documents
CREATE POLICY "company members can view documents" ON public.documents
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "company members can insert documents" ON public.documents
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "owners or admins can update documents" ON public.documents
  FOR UPDATE USING (
    company_id = public.get_user_company_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.files f
        WHERE f.id = documents.file_id
          AND f.uploader_id = auth.uid()
      )
      OR public.is_company_admin()
    )
  )
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "admins can delete documents" ON public.documents
  FOR DELETE USING (
    company_id = public.get_user_company_id() AND public.is_company_admin()
  );

-- Policies for events
CREATE POLICY "company members can view events" ON public.events
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "company members can insert events" ON public.events
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "owners or admins can update events" ON public.events
  FOR UPDATE USING (
    company_id = public.get_user_company_id()
    AND (
      EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = events.document_id
          AND d.company_id = public.get_user_company_id()
      )
      OR public.is_company_admin()
    )
  )
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "admins can delete events" ON public.events
  FOR DELETE USING (
    company_id = public.get_user_company_id() AND public.is_company_admin()
  );

-- Policies for OODA cycles
CREATE POLICY "company members can view ooda cycles" ON public.ooda_cycles
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "company admins can manage ooda cycles" ON public.ooda_cycles
  FOR ALL USING (
    company_id = public.get_user_company_id() AND public.is_company_admin()
  )
  WITH CHECK (
    company_id = public.get_user_company_id() AND public.is_company_admin()
  );

-- Helper triggers to inherit company id
CREATE OR REPLACE FUNCTION public.set_document_company_from_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_company uuid;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO file_company
  FROM public.files
  WHERE id = NEW.file_id;

  IF file_company IS NULL THEN
    RAISE EXCEPTION 'Missing company for file %', NEW.file_id;
  END IF;

  NEW.company_id := file_company;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_event_company_from_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  document_company uuid;
BEGIN
  IF NEW.document_id IS NOT NULL THEN
    SELECT company_id INTO document_company
    FROM public.documents
    WHERE id = NEW.document_id;

    IF document_company IS NULL THEN
      RAISE EXCEPTION 'Missing company for document %', NEW.document_id;
    END IF;

    NEW.company_id := document_company;
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_company_id();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER before_insert_documents_set_company
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_company_from_file();

CREATE TRIGGER before_insert_events_set_company
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_event_company_from_document();

-- Ensure tasks source defaults migrate existing rows
UPDATE public.tasks
SET source = 'manual'
WHERE source IS NULL;
