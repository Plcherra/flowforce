
-- Create enum types for roles and status
CREATE TYPE public.user_role AS ENUM ('admin', 'manager', 'employee');
CREATE TYPE public.employment_status AS ENUM ('active', 'inactive', 'terminated', 'on_leave');
CREATE TYPE public.department_type AS ENUM ('hr', 'finance', 'operations', 'sales', 'marketing', 'it', 'customer_service', 'management');

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type department_type NOT NULL,
  description TEXT,
  manager_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  employee_id TEXT UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  role user_role NOT NULL DEFAULT 'employee',
  employment_status employment_status NOT NULL DEFAULT 'active',
  hire_date DATE,
  birth_date DATE,
  address JSONB,
  emergency_contact JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table for granular permissions
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, department_id)
);

-- Create company settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL DEFAULT 'FlowForce',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',
  timezone TEXT DEFAULT 'UTC',
  working_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default company settings
INSERT INTO public.company_settings (company_name) VALUES ('FlowForce');

-- Add foreign key constraint for department manager
ALTER TABLE public.departments ADD CONSTRAINT departments_manager_id_fkey 
  FOREIGN KEY (manager_id) REFERENCES public.profiles(id);

-- Enable Row Level Security
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- RLS Policies for departments
CREATE POLICY "Everyone can view departments" ON public.departments
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can insert departments" ON public.departments
  FOR INSERT WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins and managers can update departments" ON public.departments
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can delete departments" ON public.departments
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins and managers can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins and managers can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Only admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all user roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for company_settings
CREATE POLICY "Everyone can view company settings" ON public.company_settings
  FOR SELECT USING (true);

CREATE POLICY "Only admins can update company settings" ON public.company_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, employee_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Employee'),
    'EMP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0')
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'employee');
  
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
