-- Create missing enum types that are referenced in the database schema

-- Create user_role enum
CREATE TYPE public.user_role AS ENUM (
  'employee',
  'supervisor', 
  'manager',
  'admin',
  'owner'
);

-- Create employment_status enum  
CREATE TYPE public.employment_status AS ENUM (
  'active',
  'inactive',
  'terminated',
  'on_leave'
);

-- Create schedule_type enum
CREATE TYPE public.schedule_type AS ENUM (
  'shift',
  'meeting',
  'task',
  'event'
);

-- Create schedule_status enum
CREATE TYPE public.schedule_status AS ENUM (
  'scheduled',
  'in_progress', 
  'completed',
  'cancelled',
  'missed'
);

-- Create form_status enum
CREATE TYPE public.form_status AS ENUM (
  'draft',
  'published',
  'archived'
);

-- Create form_field_type enum
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