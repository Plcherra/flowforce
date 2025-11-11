
-- Create enum for form field types
CREATE TYPE public.form_field_type AS ENUM (
  'text', 
  'textarea', 
  'number', 
  'email', 
  'phone', 
  'date', 
  'datetime', 
  'select', 
  'radio', 
  'checkbox', 
  'file'
);

-- Create enum for form status
CREATE TYPE public.form_status AS ENUM ('draft', 'published', 'archived');

-- Create forms table
CREATE TABLE public.forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status form_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  department_id UUID REFERENCES public.departments(id),
  is_anonymous BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  max_submissions INTEGER,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form fields table
CREATE TABLE public.form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  field_type form_field_type NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  field_order INTEGER NOT NULL,
  options JSONB DEFAULT '[]', -- For select, radio, checkbox fields
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create form submissions table
CREATE TABLE public.form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.forms(id),
  submitted_by UUID REFERENCES public.profiles(id), -- null for anonymous submissions
  submission_data JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create form submission files table for file uploads
CREATE TABLE public.form_submission_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.form_fields(id),
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submission_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forms
CREATE POLICY "Users can view forms they created or published forms" ON public.forms
  FOR SELECT USING (
    created_by = auth.uid() OR 
    status = 'published' OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Admins and managers can create forms" ON public.forms
  FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Form creators and admins can update forms" ON public.forms
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Form creators and admins can delete forms" ON public.forms
  FOR DELETE USING (
    created_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for form fields
CREATE POLICY "Users can view form fields for accessible forms" ON public.form_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_fields.form_id 
      AND (
        forms.created_by = auth.uid() OR 
        forms.status = 'published' OR 
        public.is_admin_or_manager(auth.uid())
      )
    )
  );

CREATE POLICY "Form creators and admins can manage form fields" ON public.form_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_fields.form_id 
      AND (
        forms.created_by = auth.uid() OR 
        public.is_admin_or_manager(auth.uid())
      )
    )
  );

-- RLS Policies for form submissions
CREATE POLICY "Users can view submissions for forms they created" ON public.form_submissions
  FOR SELECT USING (
    submitted_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_submissions.form_id 
      AND (
        forms.created_by = auth.uid() OR 
        public.is_admin_or_manager(auth.uid())
      )
    )
  );

CREATE POLICY "Users can create submissions for published forms" ON public.form_submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms 
      WHERE forms.id = form_submissions.form_id 
      AND forms.status = 'published'
      AND (forms.start_date IS NULL OR forms.start_date <= now())
      AND (forms.end_date IS NULL OR forms.end_date >= now())
    )
  );

-- RLS Policies for form submission files
CREATE POLICY "Users can view files for submissions they can access" ON public.form_submission_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.form_submissions fs
      JOIN public.forms f ON f.id = fs.form_id
      WHERE fs.id = form_submission_files.submission_id 
      AND (
        fs.submitted_by = auth.uid() OR
        f.created_by = auth.uid() OR 
        public.is_admin_or_manager(auth.uid())
      )
    )
  );

CREATE POLICY "Users can upload files for their submissions" ON public.form_submission_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.form_submissions 
      WHERE form_submissions.id = form_submission_files.submission_id 
      AND form_submissions.submitted_by = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_form_fields_updated_at
  BEFORE UPDATE ON public.form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for form file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('form-uploads', 'form-uploads', false);

-- Storage policies for form uploads
CREATE POLICY "Users can upload form files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'form-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own form files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-uploads' AND 
    (auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Form creators can view submission files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'form-uploads' AND
    EXISTS (
      SELECT 1 FROM public.form_submission_files fsf
      JOIN public.form_submissions fs ON fs.id = fsf.submission_id
      JOIN public.forms f ON f.id = fs.form_id
      WHERE fsf.storage_path = name
      AND (f.created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()))
    )
  );
