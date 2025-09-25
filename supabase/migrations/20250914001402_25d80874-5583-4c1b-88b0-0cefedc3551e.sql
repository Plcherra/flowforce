-- Check what constraints exist on inv_counts table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint 
WHERE conrelid = 'public.inv_counts'::regclass;

-- Also check the current table structure
\d public.inv_counts