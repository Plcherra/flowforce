-- Create missing enum types (only if they don't exist)

-- Create employment_status enum if it doesn't exist
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
      'event'
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
      'cancelled',
      'missed'
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

-- Create form_field_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.form_field_type AS ENUM (
      'text',
      'textarea',
      'email',
      'number',
      'date',
      'select',
      'checkbox',
      'radio',
      'file'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;