-- Inventory production events schema

CREATE TABLE public.inv_production_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
  production_type TEXT NOT NULL CHECK (production_type IN ('prep', 'batch', 'cooked', 'baked', 'other')),
  produced_quantity NUMERIC NOT NULL CHECK (produced_quantity >= 0),
  produced_unit_id UUID NOT NULL REFERENCES public.inv_units(id),
  yield_quantity NUMERIC,
  yield_unit_id UUID REFERENCES public.inv_units(id),
  waste_quantity NUMERIC DEFAULT 0,
  waste_unit_id UUID REFERENCES public.inv_units(id),
  material_cost NUMERIC NOT NULL DEFAULT 0,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  overhead_cost NUMERIC NOT NULL DEFAULT 0,
  total_output_cost NUMERIC NOT NULL DEFAULT 0,
  unit_output_cost NUMERIC,
  batch_reference TEXT,
  notes TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  produced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inv_production_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES public.inv_production_events(id) ON DELETE CASCADE,
  ingredient_item_id UUID NOT NULL REFERENCES public.inv_items(id),
  quantity_used NUMERIC NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.inv_units(id),
  unit_cost NUMERIC,
  total_cost NUMERIC,
  waste_quantity NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.inv_production_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES public.inv_production_events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted')),
  action_by UUID NOT NULL REFERENCES public.profiles(id),
  notes TEXT,
  action_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inv_production_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_production_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view production events"
  ON public.inv_production_events
  FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Staff can manage production events"
  ON public.inv_production_events
  FOR ALL
  USING (company_id = get_user_company_id());

CREATE POLICY "Company members can view production materials"
  ON public.inv_production_materials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_production_events e
      WHERE e.id = inv_production_materials.production_id
        AND e.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Staff can manage production materials"
  ON public.inv_production_materials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_production_events e
      WHERE e.id = inv_production_materials.production_id
        AND e.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company members can view production approvals"
  ON public.inv_production_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_production_events e
      WHERE e.id = inv_production_approvals.production_id
        AND e.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Managers can manage production approvals"
  ON public.inv_production_approvals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_production_events e
      WHERE e.id = inv_production_approvals.production_id
        AND e.company_id = get_user_company_id()
        AND is_admin_or_manager(auth.uid())
    )
  );

CREATE TRIGGER update_inv_production_events_updated_at
  BEFORE UPDATE ON public.inv_production_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_inv_production_materials_updated_at
  BEFORE UPDATE ON public.inv_production_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS inv_production_events_company_idx
  ON public.inv_production_events(company_id, produced_at DESC);

CREATE INDEX IF NOT EXISTS inv_production_materials_production_idx
  ON public.inv_production_materials(production_id);

CREATE INDEX IF NOT EXISTS inv_production_approvals_production_idx
  ON public.inv_production_approvals(production_id);
