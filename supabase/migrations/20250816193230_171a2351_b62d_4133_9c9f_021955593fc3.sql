-- Create a company for the user since registration didn't complete properly
-- Only run if the user exists (skip on fresh database reset)
DO $$
DECLARE
  company_uuid UUID;
  has_owner_id BOOLEAN;
  user_exists BOOLEAN;
  user_uuid UUID := '779fa725-f005-4341-a076-83d1d4ec3849';
BEGIN
  -- Check if the user exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_uuid
  ) INTO user_exists;
  
  -- Only proceed if user exists
  IF user_exists THEN
    -- Check if owner_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'companies' 
      AND column_name = 'owner_id'
    ) INTO has_owner_id;
    
    IF has_owner_id THEN
      -- owner_id exists, include it in INSERT
      INSERT INTO companies (
        id,
        name,
        created_by,
        owner_id,
        registration_complete,
        industry,
        size,
        primary_color,
        secondary_color
      ) VALUES (
        gen_random_uuid(),
        'Pedro''s Company',
        user_uuid,
        user_uuid,
        true,
        'Technology',
        '1-10',
        '#3b82f6',
        '#1e40af'
      ) 
      ON CONFLICT DO NOTHING
      RETURNING id INTO company_uuid;
    ELSE
      -- owner_id doesn't exist, exclude it from INSERT
      INSERT INTO companies (
        id,
        name,
        created_by,
        registration_complete,
        industry,
        size,
        primary_color,
        secondary_color
      ) VALUES (
        gen_random_uuid(),
        'Pedro''s Company',
        user_uuid,
        true,
        'Technology',
        '1-10',
        '#3b82f6',
        '#1e40af'
      ) 
      ON CONFLICT DO NOTHING
      RETURNING id INTO company_uuid;
    END IF;
    
    -- Link the user to their company
    UPDATE profiles 
    SET company_id = (SELECT id FROM companies WHERE created_by = user_uuid LIMIT 1)
    WHERE id = user_uuid;
  END IF;
END $$;