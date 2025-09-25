
-- Create expenses table for employee payments and other business expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id),
  category TEXT NOT NULL CHECK (category IN ('salary', 'bonus', 'reimbursement', 'supplies', 'equipment', 'software', 'utilities', 'travel', 'other')),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  expense_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT CHECK (payment_method IN ('bank_transfer', 'check', 'cash', 'card', 'payroll')),
  receipt_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory categories table
CREATE TABLE public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.inventory_categories(id),
  sku TEXT UNIQUE,
  unit_price DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  unit TEXT NOT NULL DEFAULT 'piece',
  supplier_name TEXT,
  supplier_contact TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'out_of_stock')),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory transactions table
CREATE TABLE public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return')),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  reference_number TEXT,
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for expenses
CREATE POLICY "Users can view expenses they created or expenses related to them" 
  ON public.expenses 
  FOR SELECT 
  USING (
    created_by = auth.uid() OR 
    employee_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can create expenses" 
  ON public.expenses 
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can update expenses" 
  ON public.expenses 
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete expenses" 
  ON public.expenses 
  FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS policies for inventory (admin and manager access)
CREATE POLICY "Admins and managers can view inventory categories" 
  ON public.inventory_categories 
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can manage inventory categories" 
  ON public.inventory_categories 
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can view inventory items" 
  ON public.inventory_items 
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can manage inventory items" 
  ON public.inventory_items 
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can view inventory transactions" 
  ON public.inventory_transactions 
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins and managers can create inventory transactions" 
  ON public.inventory_transactions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Add triggers for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at();

-- Insert some default inventory categories
INSERT INTO public.inventory_categories (name, description) VALUES
  ('Office Supplies', 'Pens, paper, folders, and other office materials'),
  ('Computer Equipment', 'Laptops, monitors, keyboards, mice, and accessories'),
  ('Software Licenses', 'Software subscriptions and licenses'),
  ('Furniture', 'Desks, chairs, and office furniture'),
  ('Safety Equipment', 'First aid kits, safety gear, and protective equipment');

-- Create function to update inventory stock after transactions
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stock based on transaction type
  IF NEW.transaction_type IN ('purchase', 'return') THEN
    -- Increase stock for purchases and returns
    UPDATE public.inventory_items 
    SET current_stock = current_stock + NEW.quantity 
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type IN ('sale', 'adjustment') THEN
    -- Decrease stock for sales and adjustments (if negative quantity)
    UPDATE public.inventory_items 
    SET current_stock = current_stock - NEW.quantity 
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update inventory stock
CREATE TRIGGER trigger_update_inventory_stock
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE PROCEDURE update_inventory_stock();
