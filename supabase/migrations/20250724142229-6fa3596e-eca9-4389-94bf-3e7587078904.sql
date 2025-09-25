-- Fix the missing column issue and clean up the problematic user account
-- First, delete the existing user account and all related data

-- Delete the user from auth.users which should cascade to most tables
DELETE FROM auth.users WHERE email = 'plcherra@gmail.com';

-- Clean up any remaining profile records (just in case)
DELETE FROM public.profiles WHERE email = 'plcherra@gmail.com';