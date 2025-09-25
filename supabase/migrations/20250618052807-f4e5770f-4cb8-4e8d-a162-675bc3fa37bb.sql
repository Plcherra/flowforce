
-- Create payments table for financial management
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_type TEXT NOT NULL, -- 'wage', 'vendor', 'expense_reimbursement', 'other'
  recipient_type TEXT NOT NULL, -- 'employee', 'vendor', 'contractor'
  recipient_id UUID, -- references profiles.id for employees
  recipient_name TEXT NOT NULL, -- vendor name or employee name
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT, -- 'bank_transfer', 'check', 'cash', 'credit_card'
  reference_number TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid', 'cancelled'
  due_date DATE,
  paid_date DATE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Create payment approvals table for workflow tracking
CREATE TABLE public.payment_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase orders table for inventory management
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_contact JSONB, -- email, phone, address
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'confirmed', 'received', 'cancelled'
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase order items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments they created or are recipients of"
  ON public.payments FOR SELECT
  USING (
    created_by = auth.uid() OR 
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Users can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Managers and admins can update payments"
  ON public.payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Add RLS policies for payment approvals
ALTER TABLE public.payment_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment approvals for their payments or if they're approvers"
  ON public.payment_approvals FOR SELECT
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.id = payment_id AND p.created_by = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Managers and admins can manage payment approvals"
  ON public.payment_approvals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Add RLS policies for purchase orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can manage purchase orders"
  ON public.purchase_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('supervisor', 'manager', 'admin')
    )
  );

-- Add RLS policies for purchase order items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can manage purchase order items"
  ON public.purchase_order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('supervisor', 'manager', 'admin')
    )
  );

-- Add triggers for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_payment_approvals_updated_at
  BEFORE UPDATE ON public.payment_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
