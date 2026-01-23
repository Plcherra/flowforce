-- Create helpdesk_tickets table
CREATE TABLE IF NOT EXISTS public.helpdesk_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS helpdesk_tickets_company_id_idx ON public.helpdesk_tickets(company_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_status_idx ON public.helpdesk_tickets(status);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_requester_id_idx ON public.helpdesk_tickets(requester_id);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_assigned_to_idx ON public.helpdesk_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS helpdesk_tickets_created_at_idx ON public.helpdesk_tickets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "helpdesk_tickets_select_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_select_own_company" ON public.helpdesk_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

DROP POLICY IF EXISTS "helpdesk_tickets_insert_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_insert_own_company" ON public.helpdesk_tickets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

DROP POLICY IF EXISTS "helpdesk_tickets_update_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_update_own_company" ON public.helpdesk_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

DROP POLICY IF EXISTS "helpdesk_tickets_delete_own_company" ON public.helpdesk_tickets;
CREATE POLICY "helpdesk_tickets_delete_own_company" ON public.helpdesk_tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.company_id = helpdesk_tickets.company_id
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_helpdesk_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_helpdesk_tickets_updated_at_trigger ON public.helpdesk_tickets;
CREATE TRIGGER update_helpdesk_tickets_updated_at_trigger
  BEFORE UPDATE ON public.helpdesk_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_helpdesk_tickets_updated_at();
