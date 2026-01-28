-- Create the missing user_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM (
      'employee',
      'manager', 
      'admin',
      'owner',
      'supervisor'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create employment_status enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.employment_status AS ENUM (
        'active',
        'inactive',
        'terminated',
        'on_leave'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create schedule_type enum if it doesn't exist  
DO $$ BEGIN
    CREATE TYPE public.schedule_type AS ENUM (
        'shift',
        'meeting',
        'task',
        'break'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create schedule_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.schedule_status AS ENUM (
        'scheduled',
        'in_progress', 
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create form_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.form_status AS ENUM (
        'draft',
        'published',
        'archived'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create field_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.field_type AS ENUM (
        'text',
        'textarea', 
        'email',
        'number',
        'date',
        'select',
        'multiselect',
        'checkbox',
        'radio',
        'file'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;