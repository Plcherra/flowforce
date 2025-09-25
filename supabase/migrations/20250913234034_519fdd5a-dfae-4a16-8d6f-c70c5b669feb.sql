-- Add currency field to companies table
ALTER TABLE public.companies 
ADD COLUMN currency text DEFAULT 'USD';

-- Add unit_quantity field to inv_items table for storing the quantity part of unit size
ALTER TABLE public.inv_items 
ADD COLUMN unit_quantity numeric DEFAULT 1;