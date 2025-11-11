-- Check if user_role type exists and create it if missing
DO $$ 
BEGIN
    -- Create user_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin', 'owner');
    END IF;
    
    -- Create employment_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
        CREATE TYPE employment_status AS ENUM ('active', 'inactive', 'terminated', 'on_leave');
    END IF;
    
    -- Create schedule_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
        CREATE TYPE schedule_type AS ENUM ('shift', 'meeting', 'event', 'task');
    END IF;
    
    -- Create schedule_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status') THEN
        CREATE TYPE schedule_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    -- Create form_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_status') THEN
        CREATE TYPE form_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    
    -- Create field_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type') THEN
        CREATE TYPE field_type AS ENUM ('text', 'email', 'number', 'select', 'checkbox', 'textarea', 'file', 'date');
    END IF;
END $$;