
-- First migration: Add the missing enum values
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'supervisor'; 
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
