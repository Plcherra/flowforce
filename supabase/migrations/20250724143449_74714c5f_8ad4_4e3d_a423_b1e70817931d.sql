-- Create missing enum types that are referenced in the database schema
-- Note: PostgreSQL doesn't support CREATE TYPE IF NOT EXISTS, so we check first

DO $$
BEGIN
  -- Create user_role enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    CREATE TYPE public.user_role AS ENUM (
      'employee',
      'supervisor', 
      'manager',
      'admin',
      'owner'
    );
  END IF;

  -- Create employment_status enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    CREATE TYPE public.employment_status AS ENUM (
      'active',
      'inactive',
      'terminated',
      'on_leave'
    );
  END IF;

  -- Create schedule_type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    CREATE TYPE public.schedule_type AS ENUM (
      'shift',
      'meeting',
      'task',
      'event'
    );
  END IF;

  -- Create schedule_status enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    CREATE TYPE public.schedule_status AS ENUM (
      'scheduled',
      'in_progress', 
      'completed',
      'cancelled',
      'missed'
    );
  END IF;

  -- Create form_status enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    CREATE TYPE public.form_status AS ENUM (
      'draft',
      'published',
      'archived'
    );
  END IF;

  -- Create form_field_type enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_field_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
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
  END IF;
END $$;