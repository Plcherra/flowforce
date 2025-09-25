-- Clean up the problematic user account properly by handling foreign key constraints
-- First, remove the user from companies they own by transferring or deleting the company

-- Check and transfer/delete companies owned by the user
DO $$
DECLARE
    company_rec RECORD;
    other_admin_id UUID;
BEGIN
    -- Loop through companies owned by the problematic user
    FOR company_rec IN 
        SELECT id, name FROM public.companies 
        WHERE created_by = 'b6da4131-e833-40f2-844e-a1b152d09546'
    LOOP
        -- Look for other admins in the company
        SELECT id INTO other_admin_id 
        FROM public.profiles 
        WHERE company_id = company_rec.id 
          AND is_company_admin = true 
          AND id != 'b6da4131-e833-40f2-844e-a1b152d09546'
        LIMIT 1;
        
        IF other_admin_id IS NOT NULL THEN
            -- Transfer ownership
            UPDATE public.companies 
            SET created_by = other_admin_id 
            WHERE id = company_rec.id;
        ELSE
            -- No other admins, delete the company and related data
            -- First delete all related data
            DELETE FROM public.company_roles WHERE company_id = company_rec.id;
            DELETE FROM public.company_invites WHERE company_id = company_rec.id;
            DELETE FROM public.profiles WHERE company_id = company_rec.id;
            DELETE FROM public.companies WHERE id = company_rec.id;
        END IF;
    END LOOP;
END
$$;

-- Now safely delete the problematic user account
DELETE FROM auth.users WHERE email = 'plcherra@gmail.com';