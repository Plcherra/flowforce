
-- Create index for company_invites table
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON public.company_invites(email);
