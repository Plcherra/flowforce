-- Remove the restrictive check constraint on count_type to allow custom count types
ALTER TABLE public.inv_counts DROP CONSTRAINT IF EXISTS inv_counts_count_type_check;