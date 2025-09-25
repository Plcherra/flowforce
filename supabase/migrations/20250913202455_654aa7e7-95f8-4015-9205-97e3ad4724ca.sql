-- Create comprehensive inventory system tables

-- Units of measure
CREATE TABLE public.inv_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count', 'length')),
  base_unit_id UUID REFERENCES public.inv_units(id),
  conversion_factor DECIMAL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Storage locations
CREATE TABLE public.inv_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('storage', 'prep', 'service', 'waste')),
  temperature_controlled BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.inv_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address JSONB,
  payment_terms TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory items
CREATE TABLE public.inv_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT,
  unit_id UUID NOT NULL REFERENCES public.inv_units(id),
  default_location_id UUID REFERENCES public.inv_locations(id),
  cost_per_unit DECIMAL,
  preferred_supplier_id UUID REFERENCES public.inv_suppliers(id),
  shelf_life_days INTEGER,
  min_stock_level DECIMAL DEFAULT 0,
  max_stock_level DECIMAL,
  is_prep_item BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recipes and ingredient relationships
CREATE TABLE public.inv_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  ingredient_id UUID NOT NULL REFERENCES public.inv_items(id),
  quantity_needed DECIMAL NOT NULL,
  unit_id UUID NOT NULL REFERENCES public.inv_units(id),
  yield_amount DECIMAL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- PAR level profiles (weekday/weekend)
CREATE TABLE public.inv_par_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  location_id UUID REFERENCES public.inv_locations(id),
  weekday_min DECIMAL NOT NULL DEFAULT 0,
  weekday_max DECIMAL NOT NULL DEFAULT 0,
  weekend_min DECIMAL NOT NULL DEFAULT 0,
  weekend_max DECIMAL NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id)
);

-- PAR level overrides for specific dates
CREATE TABLE public.inv_par_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  location_id UUID REFERENCES public.inv_locations(id),
  override_date DATE NOT NULL,
  min_level DECIMAL NOT NULL,
  max_level DECIMAL NOT NULL,
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id, override_date)
);

-- Stock lots for tracking batches/expiration
CREATE TABLE public.inv_stock_lots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  location_id UUID NOT NULL REFERENCES public.inv_locations(id),
  lot_number TEXT,
  quantity DECIMAL NOT NULL DEFAULT 0,
  unit_cost DECIMAL,
  expiration_date DATE,
  received_date DATE DEFAULT CURRENT_DATE,
  supplier_id UUID REFERENCES public.inv_suppliers(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Physical counts
CREATE TABLE public.inv_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  location_id UUID REFERENCES public.inv_locations(id),
  count_type TEXT NOT NULL CHECK (count_type IN ('full', 'cycle', 'spot')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  notes TEXT,
  counted_by UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Count line items
CREATE TABLE public.inv_count_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  count_id UUID NOT NULL REFERENCES public.inv_counts(id),
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  expected_quantity DECIMAL DEFAULT 0,
  counted_quantity DECIMAL NOT NULL,
  variance DECIMAL GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
  lot_id UUID REFERENCES public.inv_stock_lots(id),
  notes TEXT,
  counted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Purchase orders
CREATE TABLE public.inv_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.inv_suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'partial', 'received', 'cancelled')),
  subtotal DECIMAL DEFAULT 0,
  tax_amount DECIMAL DEFAULT 0,
  total_amount DECIMAL DEFAULT 0,
  notes TEXT,
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Purchase order line items
CREATE TABLE public.inv_purchase_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID NOT NULL REFERENCES public.inv_purchases(id),
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  quantity_ordered DECIMAL NOT NULL,
  quantity_received DECIMAL DEFAULT 0,
  unit_cost DECIMAL NOT NULL,
  line_total DECIMAL GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  lot_number TEXT,
  expiration_date DATE,
  received_date DATE,
  notes TEXT
);

-- Prep batches
CREATE TABLE public.inv_prep_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  prep_date DATE NOT NULL DEFAULT CURRENT_DATE,
  planned_quantity DECIMAL NOT NULL,
  actual_quantity DECIMAL,
  batch_size DECIMAL DEFAULT 1,
  batches_made INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  prep_location_id UUID REFERENCES public.inv_locations(id),
  prepared_by UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Waste tracking
CREATE TABLE public.inv_waste (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  location_id UUID REFERENCES public.inv_locations(id),
  quantity DECIMAL NOT NULL,
  waste_type TEXT NOT NULL CHECK (waste_type IN ('spoilage', 'prep_error', 'accident', 'theft', 'other')),
  reason TEXT,
  cost_impact DECIMAL,
  lot_id UUID REFERENCES public.inv_stock_lots(id),
  recorded_by UUID NOT NULL,
  waste_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inventory adjustments
CREATE TABLE public.inv_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.inv_items(id),
  location_id UUID REFERENCES public.inv_locations(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'transfer')),
  quantity DECIMAL NOT NULL,
  reason TEXT NOT NULL,
  from_location_id UUID REFERENCES public.inv_locations(id),
  to_location_id UUID REFERENCES public.inv_locations(id),
  reference_number TEXT,
  cost_impact DECIMAL,
  lot_id UUID REFERENCES public.inv_stock_lots(id),
  adjusted_by UUID NOT NULL,
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.inv_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_par_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_par_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_count_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_prep_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company-scoped tables
CREATE POLICY "Company members can view units" ON public.inv_units FOR SELECT USING (true);
CREATE POLICY "Managers can manage units" ON public.inv_units FOR ALL USING (is_admin_or_manager(auth.uid()));

CREATE POLICY "Company members can view locations" ON public.inv_locations FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Managers can manage locations" ON public.inv_locations FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Company members can view suppliers" ON public.inv_suppliers FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Managers can manage suppliers" ON public.inv_suppliers FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Company members can view items" ON public.inv_items FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Managers can manage items" ON public.inv_items FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Company members can view recipes" ON public.inv_recipes FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_recipes.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Managers can manage recipes" ON public.inv_recipes FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_recipes.item_id AND company_id = get_user_company_id() AND is_admin_or_manager(auth.uid())));

CREATE POLICY "Company members can view PAR profiles" ON public.inv_par_profiles FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_par_profiles.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Managers can manage PAR profiles" ON public.inv_par_profiles FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_par_profiles.item_id AND company_id = get_user_company_id() AND is_admin_or_manager(auth.uid())));

CREATE POLICY "Company members can view PAR overrides" ON public.inv_par_overrides FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_par_overrides.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Managers can manage PAR overrides" ON public.inv_par_overrides FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_par_overrides.item_id AND company_id = get_user_company_id() AND is_admin_or_manager(auth.uid())));

CREATE POLICY "Company members can view stock lots" ON public.inv_stock_lots FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_stock_lots.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Staff can manage stock lots" ON public.inv_stock_lots FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_stock_lots.item_id AND company_id = get_user_company_id()));

CREATE POLICY "Company members can view counts" ON public.inv_counts FOR SELECT USING (EXISTS (SELECT 1 FROM inv_locations WHERE id = inv_counts.location_id AND company_id = get_user_company_id()));
CREATE POLICY "Staff can manage counts" ON public.inv_counts FOR ALL USING (EXISTS (SELECT 1 FROM inv_locations WHERE id = inv_counts.location_id AND company_id = get_user_company_id()));

CREATE POLICY "Company members can view count lines" ON public.inv_count_lines FOR SELECT USING (EXISTS (SELECT 1 FROM inv_counts c JOIN inv_locations l ON l.id = c.location_id WHERE c.id = inv_count_lines.count_id AND l.company_id = get_user_company_id()));
CREATE POLICY "Staff can manage count lines" ON public.inv_count_lines FOR ALL USING (EXISTS (SELECT 1 FROM inv_counts c JOIN inv_locations l ON l.id = c.location_id WHERE c.id = inv_count_lines.count_id AND l.company_id = get_user_company_id()));

CREATE POLICY "Company members can view purchases" ON public.inv_purchases FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Managers can manage purchases" ON public.inv_purchases FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_manager(auth.uid()));

CREATE POLICY "Company members can view purchase lines" ON public.inv_purchase_lines FOR SELECT USING (EXISTS (SELECT 1 FROM inv_purchases WHERE id = inv_purchase_lines.purchase_id AND company_id = get_user_company_id()));
CREATE POLICY "Managers can manage purchase lines" ON public.inv_purchase_lines FOR ALL USING (EXISTS (SELECT 1 FROM inv_purchases WHERE id = inv_purchase_lines.purchase_id AND company_id = get_user_company_id() AND is_admin_or_manager(auth.uid())));

CREATE POLICY "Company members can view prep batches" ON public.inv_prep_batches FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_prep_batches.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Staff can manage prep batches" ON public.inv_prep_batches FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_prep_batches.item_id AND company_id = get_user_company_id()));

CREATE POLICY "Company members can view waste" ON public.inv_waste FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_waste.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Staff can manage waste" ON public.inv_waste FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_waste.item_id AND company_id = get_user_company_id()));

CREATE POLICY "Company members can view adjustments" ON public.inv_adjustments FOR SELECT USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_adjustments.item_id AND company_id = get_user_company_id()));
CREATE POLICY "Staff can manage adjustments" ON public.inv_adjustments FOR ALL USING (EXISTS (SELECT 1 FROM inv_items WHERE id = inv_adjustments.item_id AND company_id = get_user_company_id()));

-- Create updated_at triggers
CREATE TRIGGER update_inv_units_updated_at BEFORE UPDATE ON public.inv_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_locations_updated_at BEFORE UPDATE ON public.inv_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_suppliers_updated_at BEFORE UPDATE ON public.inv_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_items_updated_at BEFORE UPDATE ON public.inv_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_recipes_updated_at BEFORE UPDATE ON public.inv_recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_par_profiles_updated_at BEFORE UPDATE ON public.inv_par_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_stock_lots_updated_at BEFORE UPDATE ON public.inv_stock_lots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_inv_purchases_updated_at BEFORE UPDATE ON public.inv_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert sample units
INSERT INTO public.inv_units (name, abbreviation, unit_type) VALUES
('Each', 'ea', 'count'),
('Pound', 'lb', 'weight'),
('Ounce', 'oz', 'weight'),
('Kilogram', 'kg', 'weight'),
('Gram', 'g', 'weight'),
('Gallon', 'gal', 'volume'),
('Quart', 'qt', 'volume'),
('Liter', 'L', 'volume'),
('Milliliter', 'ml', 'volume'),
('Cup', 'cup', 'volume');