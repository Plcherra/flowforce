-- Inventory internal transfers: tables, policies, and automation

-- Main transfer records
CREATE TABLE public.inv_transfers (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  fulfiller_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  from_location_id UUID NOT NULL REFERENCES public.inv_locations(id),
  to_location_id UUID NOT NULL REFERENCES public.inv_locations(id),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'sent', 'received', 'rejected')),
  delivery_date DATE,
  comments TEXT,
  status_note TEXT,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  total_quantity NUMERIC NOT NULL DEFAULT 0,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (from_location_id <> to_location_id)
);

-- Line items for each transfer
CREATE TABLE public.inv_transfer_items (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.inv_transfers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  unit_id UUID NOT NULL REFERENCES public.inv_units(id),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  cost_per_unit NUMERIC,
  total_cost NUMERIC GENERATED ALWAYS AS (COALESCE(quantity, 0) * COALESCE(cost_per_unit, 0)) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (transfer_id, item_id, unit_id)
);

-- Audit history for transfers
CREATE TABLE public.inv_transfer_audit (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.inv_transfers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  actor_id UUID REFERENCES public.profiles(id),
  note TEXT,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_inv_transfers_company ON public.inv_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_status ON public.inv_transfers(status);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_fulfiller ON public.inv_transfers(fulfiller_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfers_recipient ON public.inv_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfer_items_transfer ON public.inv_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_inv_transfer_audit_transfer ON public.inv_transfer_audit(transfer_id);

-- Basic automation helpers
CREATE OR REPLACE FUNCTION public.ensure_inv_transfer_defaults()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := get_user_company_id();
  END IF;

  IF NEW.requested_by IS NULL THEN
    NEW.requested_by := auth.uid();
  END IF;

  IF NEW.status_note IS NULL THEN
    NEW.status_note := NEW.comments;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_insert_inv_transfers
  BEFORE INSERT ON public.inv_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_inv_transfer_defaults();

-- Keep parent totals in sync with line items
CREATE OR REPLACE FUNCTION public.refresh_inv_transfer_totals()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.transfer_id, OLD.transfer_id);

  UPDATE public.inv_transfers
  SET
    total_cost = COALESCE((
      SELECT SUM(total_cost)
      FROM public.inv_transfer_items
      WHERE transfer_id = target_id
    ), 0),
    total_quantity = COALESCE((
      SELECT SUM(quantity)
      FROM public.inv_transfer_items
      WHERE transfer_id = target_id
    ), 0),
    updated_at = now()
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inv_transfer_items_after_insert
  AFTER INSERT ON public.inv_transfer_items
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_inv_transfer_totals();

CREATE TRIGGER inv_transfer_items_after_update
  AFTER UPDATE ON public.inv_transfer_items
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_inv_transfer_totals();

CREATE TRIGGER inv_transfer_items_after_delete
  AFTER DELETE ON public.inv_transfer_items
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_inv_transfer_totals();

-- Audit logging for transfer lifecycle
CREATE OR REPLACE FUNCTION public.log_inv_transfer_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  actor UUID;
BEGIN
  actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    action_type := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action_type := 'status_changed';
    ELSIF NEW.comments IS DISTINCT FROM OLD.comments
       OR NEW.delivery_date IS DISTINCT FROM OLD.delivery_date
       OR NEW.status_note IS DISTINCT FROM OLD.status_note THEN
      action_type := 'updated';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'deleted';
  END IF;

  INSERT INTO public.inv_transfer_audit (
    transfer_id,
    action,
    old_status,
    new_status,
    actor_id,
    note,
    old_values,
    new_values
  )
  VALUES (
    COALESCE(NEW.id, OLD.id),
    action_type,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.status END,
    actor,
    CASE 
      WHEN TG_OP = 'INSERT' THEN NEW.status_note
      WHEN TG_OP = 'UPDATE' THEN NEW.status_note
      ELSE OLD.status_note
    END,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER inv_transfers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inv_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inv_transfer_change();

-- Maintain updated_at column
CREATE TRIGGER update_inv_transfers_updated_at
  BEFORE UPDATE ON public.inv_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.inv_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_transfer_audit ENABLE ROW LEVEL SECURITY;

-- Access policies
CREATE POLICY "Company members can view transfers"
  ON public.inv_transfers
  FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Staff can insert transfers"
  ON public.inv_transfers
  FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Participants can update transfers"
  ON public.inv_transfers
  FOR UPDATE
  USING (
    company_id = get_user_company_id()
    AND (
      requested_by = auth.uid()
      OR fulfiller_id = auth.uid()
      OR recipient_id = auth.uid()
      OR is_admin_or_manager(auth.uid())
    )
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Managers can delete transfers"
  ON public.inv_transfers
  FOR DELETE
  USING (
    company_id = get_user_company_id()
    AND is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Company members can view transfer items"
  ON public.inv_transfer_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_transfers t
      WHERE t.id = public.inv_transfer_items.transfer_id
        AND t.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Participants can manage transfer items"
  ON public.inv_transfer_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_transfers t
      WHERE t.id = public.inv_transfer_items.transfer_id
        AND t.company_id = get_user_company_id()
        AND (
          t.requested_by = auth.uid()
          OR t.fulfiller_id = auth.uid()
          OR t.recipient_id = auth.uid()
          OR is_admin_or_manager(auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.inv_transfers t
      WHERE t.id = public.inv_transfer_items.transfer_id
        AND t.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company members can view transfer audit"
  ON public.inv_transfer_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_transfers t
      WHERE t.id = public.inv_transfer_audit.transfer_id
        AND t.company_id = get_user_company_id()
    )
  );
