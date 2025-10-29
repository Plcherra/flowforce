-- Create centralized system settings table to power the Admin Configuration Hub
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  general jsonb NOT NULL DEFAULT jsonb_build_object(
    'companyName', '',
    'contactEmail', null,
    'contactPhone', null,
    'website', null,
    'logoUrl', null,
    'address', null
  ),
  security jsonb NOT NULL DEFAULT jsonb_build_object(
    'twoFactorRequired', false,
    'enforceForAdmins', true,
    'passwordPolicy', jsonb_build_object(
      'minLength', 12,
      'requireUppercase', true,
      'requireLowercase', true,
      'requireNumber', true,
      'requireSpecial', false
    ),
    'sessionTimeout', 30,
    'trustedDeviceWindow', 14
  ),
  localization jsonb NOT NULL DEFAULT jsonb_build_object(
    'timezone', 'UTC',
    'language', 'en',
    'currency', 'USD',
    'regionalFormats', jsonb_build_object(
      'date', 'MM/DD/YYYY',
      'time', 'hh:mm A',
      'number', '1,234.56'
    )
  ),
  notifications jsonb NOT NULL DEFAULT jsonb_build_object(
    'deliveryChannels', jsonb_build_array('email', 'in_app'),
    'digestEnabled', true,
    'digestHour', 8,
    'moduleOverrides', jsonb_build_object(),
    'escalations', jsonb_build_object(
      'criticalModules', jsonb_build_array(),
      'reminderWindowMinutes', 15
    )
  ),
  integrations jsonb NOT NULL DEFAULT jsonb_build_object(
    'connections', jsonb_build_array(),
    'providers', jsonb_build_object(
      'toast', jsonb_build_object('status', 'disconnected', 'authType', 'api_key'),
      'marketman', jsonb_build_object('status', 'disconnected', 'authType', 'api_key'),
      'connecteam', jsonb_build_object('status', 'disconnected', 'authType', 'oauth')
    ),
    'syncMappings', jsonb_build_object(),
    'lastSyncedAt', null
  ),
  appearance jsonb NOT NULL DEFAULT jsonb_build_object(
    'theme', 'light',
    'primaryColor', '#3b82f6',
    'secondaryColor', '#1e40af',
    'accentColor', '#0ea5e9',
    'logoPlacement', 'sidebar',
    'sidebarBranding', jsonb_build_object('enabled', true, 'background', 'default'),
    'dashboardLayout', 'standard',
    'preview', jsonb_build_object('isActive', false, 'expiresAt', null)
  ),
  admin_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'businessStructure', jsonb_build_object(
      'workingHours', null,
      'locations', jsonb_build_array(),
      'departments', jsonb_build_array()
    ),
    'roleTemplates', jsonb_build_array(),
    'apiMonitoring', jsonb_build_object(
      'webhookUrl', null,
      'alertThresholds', jsonb_build_object(
        'errorRate', 5,
        'latencyMs', 2000
      ),
      'lastAlertAt', null
    ),
    'aiCopilot', jsonb_build_object(
      'enabled', false,
      'scopes', jsonb_build_array(),
      'restrictedModules', jsonb_build_array()
    )
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT system_settings_company_unique UNIQUE (company_id)
);

-- Maintain updated_at automatically when rows change
DROP TRIGGER IF EXISTS set_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER set_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Secure access to the table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
CREATE POLICY "system_settings_select" ON public.system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = system_settings.company_id
    )
  );

DROP POLICY IF EXISTS "system_settings_insert" ON public.system_settings;
CREATE POLICY "system_settings_insert" ON public.system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = system_settings.company_id
        AND p.role IN ('owner', 'company_admin', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "system_settings_update" ON public.system_settings;
CREATE POLICY "system_settings_update" ON public.system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = system_settings.company_id
        AND p.role IN ('owner', 'company_admin', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = system_settings.company_id
        AND p.role IN ('owner', 'company_admin', 'admin', 'manager')
    )
  );

-- Ensure each company has a corresponding system settings row
INSERT INTO public.system_settings (company_id)
SELECT c.id
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.system_settings ss
  WHERE ss.company_id = c.id
);
