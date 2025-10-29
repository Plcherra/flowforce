import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useCompanyRoles } from '@/hooks/useCompanyRoles';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';
import type { CompanySettings } from '@/types/common';
import type {
  AdminConfigurationSettings,
  AICopilotSettings,
  ApiMonitoringSettings,
  AppearanceSettings,
  BusinessStructureSettings,
  GeneralSettings,
  IntegrationConnection,
  IntegrationsSettings,
  LocalizationSettings,
  ModuleNotificationOverride,
  NotificationsSettings,
  SecuritySettings,
} from '@/types/system-settings';
import { cn } from '@/lib/utils';
import {
  Activity,
  Bell,
  Bot,
  Building,
  CheckCircle2,
  Factory,
  Globe,
  Loader2,
  Palette,
  Shield,
  UploadCloud,
  Zap,
  Settings as SettingsIcon,
} from 'lucide-react';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern (US & Canada)' },
  { value: 'America/Chicago', label: 'Central (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific (US & Canada)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (Japan)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
];

const MODULE_OPTIONS: Array<{ key: string; label: string; description: string }> = [
  { key: 'scheduling', label: 'Scheduling', description: 'Shift publishing, changes, and confirmations' },
  { key: 'tasks', label: 'Tasks', description: 'Assignments, due reminders, and completions' },
  { key: 'payments', label: 'Payments', description: 'Expense approvals and payout readiness' },
  { key: 'inventory', label: 'Inventory', description: 'Count alerts, purchase orders, and transfers' },
  { key: 'announcements', label: 'Announcements', description: 'Company-wide announcements and updates' },
];

const NOTIFICATION_CHANNELS = [
  { key: 'email', label: 'Email' },
  { key: 'in_app', label: 'In-App' },
  { key: 'sms', label: 'SMS' },
  { key: 'push', label: 'Push' },
];

const PREVIEW_EXPIRY_MINUTES = 30;

const AVAILABLE_COPILOT_SCOPES = [
  'scheduling',
  'tasks',
  'inventory',
  'finance',
  'hr',
  'learning',
];

const AVAILABLE_LOCATIONS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'office', label: 'Office' },
  { value: 'production', label: 'Production' },
  { value: 'virtual', label: 'Virtual' },
];

const DEFAULT_OVERRIDE: ModuleNotificationOverride = {
  email: true,
  in_app: true,
  sms: false,
  push: false,
};

type InventoryLocation = Tables<'inv_locations'>;

type WorkingHours = CompanySettings['working_hours'];

type WorkingDayKey = keyof WorkingHours;

const WORKING_DAYS: WorkingDayKey[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const defaultWorkingHours = (): WorkingHours => ({
  monday: { start: '09:00', end: '17:00', enabled: true },
  tuesday: { start: '09:00', end: '17:00', enabled: true },
  wednesday: { start: '09:00', end: '17:00', enabled: true },
  thursday: { start: '09:00', end: '17:00', enabled: true },
  friday: { start: '09:00', end: '17:00', enabled: true },
  saturday: { start: '09:00', end: '17:00', enabled: false },
  sunday: { start: '09:00', end: '17:00', enabled: false },
});

function normalizeGeneralState(general: GeneralSettings) {
  return {
    companyName: general.companyName ?? '',
    companyDescription: general.companyDescription ?? '',
    contactEmail: general.contactEmail ?? '',
    contactPhone: general.contactPhone ?? '',
    website: general.website ?? '',
    address: general.address ?? '',
  };
}

function normalizeLocalizationState(localization: LocalizationSettings) {
  return {
    timezone: localization.timezone,
    language: localization.language,
    currency: localization.currency,
    dateFormat: localization.regionalFormats.date,
    timeFormat: localization.regionalFormats.time,
    numberFormat: localization.regionalFormats.number,
  };
}

const integrationProviders = [
  {
    key: 'toast',
    name: 'Toast',
    description: 'Payroll, scheduling, and sales data sync',
    authType: 'api_key' as const,
    documentation: 'https://pos.toasttab.com/'
  },
  {
    key: 'marketman',
    name: 'MarketMan',
    description: 'Inventory and recipe cost synchronization',
    authType: 'api_key' as const,
    documentation: 'https://www.marketman.com/'
  },
  {
    key: 'connecteam',
    name: 'Connecteam',
    description: 'Scheduling and HR data via OAuth',
    authType: 'oauth' as const,
    documentation: 'https://www.connecteam.com/'
  },
];

export default function Settings() {
  const {
    settings,
    company,
    loading,
    saving,
    canEdit,
    role,
    isCompanyAdmin,
    refresh,
    updateGeneral,
    updateSecurity,
    updateLocalization,
    updateNotifications,
    updateIntegrations,
    connectIntegration,
    disconnectIntegration,
    updateAppearance,
    setAppearancePreview,
    updateAdminConfig,
    syncAdminConfigSnapshot,
  } = useSystemSettings();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState<'system' | 'admin'>('system');
  const [systemTab, setSystemTab] = useState('general');
  const [adminTab, setAdminTab] = useState('structure');

  useEffect(() => {
    if (settings) {
      setSystemTab('general');
    }
  }, [settings]);

  if (loading || !settings || !company) {
    return (
      <RoleGuard
        roles={['admin', 'company_admin', 'owner']}
        fallback={<AccessDenied />}
      >
        <div className="flex h-full items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading system settings…</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard
      roles={['admin', 'company_admin', 'owner', 'manager']}
      fallback={<AccessDenied />}
    >
      <div className="space-y-6 p-6 md:p-10">
        <header className="flex flex-col gap-4 rounded-xl bg-muted/40 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-semibold text-foreground">System Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Configure company profile, governance, and administrative controls.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{company.name}</Badge>
              <Badge variant={canEdit ? 'default' : 'secondary'}>
                {canEdit ? 'Admin access' : 'Read-only'}
              </Badge>
              {role && <Badge variant="ghost">Role: {role}</Badge>}
              {isCompanyAdmin && <Badge variant="ghost">Company Admin</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => refresh()}
              disabled={loading}
            >
              Refresh data
            </Button>
          </div>
        </header>

        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as 'system' | 'admin')}>
          <TabsList className="grid w-full grid-cols-2 md:w-auto">
            <TabsTrigger value="system">System Settings</TabsTrigger>
            <TabsTrigger value="admin">Admin Configuration</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-6">
            <Tabs value={systemTab} onValueChange={setSystemTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="general">
                  <Building className="mr-2 h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="mr-2 h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="localization">
                  <Globe className="mr-2 h-4 w-4" />
                  Localization
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="integrations">
                  <Zap className="mr-2 h-4 w-4" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="appearance">
                  <Palette className="mr-2 h-4 w-4" />
                  Appearance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-6">
                <GeneralSettingsForm
                  general={settings.general}
                  canEdit={canEdit}
                  saving={saving.general}
                  onSave={async (payload, options) => {
                    await updateGeneral(payload, options);
                    toast({ title: 'General settings saved' });
                  }}
                />
              </TabsContent>

              <TabsContent value="security" className="mt-6">
                <SecuritySettingsPanel
                  security={settings.security}
                  canEdit={canEdit}
                  saving={saving.security}
                  onSave={async (payload) => {
                    await updateSecurity(payload);
                    toast({ title: 'Security policies saved' });
                  }}
                />
              </TabsContent>

              <TabsContent value="localization" className="mt-6">
                <LocalizationSettingsForm
                  localization={settings.localization}
                  canEdit={canEdit}
                  saving={saving.localization}
                  onSave={async (payload) => {
                    await updateLocalization(payload);
                    toast({ title: 'Localization preferences updated' });
                  }}
                />
              </TabsContent>

              <TabsContent value="notifications" className="mt-6">
                <NotificationsSettingsPanel
                  notifications={settings.notifications}
                  canEdit={canEdit}
                  saving={saving.notifications}
                  onSave={async (payload) => {
                    await updateNotifications(payload);
                    toast({ title: 'Notification defaults saved' });
                  }}
                />
              </TabsContent>

              <TabsContent value="integrations" className="mt-6">
                <IntegrationsPanel
                  integrations={settings.integrations}
                  canEdit={canEdit}
                  saving={saving.integrations}
                  onConnect={connectIntegration}
                  onDisconnect={disconnectIntegration}
                />
              </TabsContent>

              <TabsContent value="appearance" className="mt-6">
                <AppearanceSettingsPanel
                  appearance={settings.appearance}
                  canEdit={canEdit}
                  saving={saving.appearance}
                  onPreview={async (draft) => {
                    await updateAppearance(draft, { previewOnly: true });
                    setAppearancePreview({ isActive: true, expiresAt: new Date(Date.now() + PREVIEW_EXPIRY_MINUTES * 60 * 1000).toISOString(), snapshot: draft });
                  }}
                  onCancelPreview={async () => {
                    await refresh();
                    setAppearancePreview({ isActive: false, expiresAt: null, snapshot: undefined });
                  }}
                  onSave={async (draft) => {
                    await updateAppearance({
                      ...draft,
                      preview: { isActive: false, expiresAt: null, snapshot: undefined },
                    });
                    toast({ title: 'Theme updated' });
                  }}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            <Tabs value={adminTab} onValueChange={setAdminTab}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="structure">
                  <Factory className="mr-2 h-4 w-4" />
                  Business Structure
                </TabsTrigger>
                <TabsTrigger value="roles">
                  <Shield className="mr-2 h-4 w-4" />
                  Role Templates
                </TabsTrigger>
                <TabsTrigger value="monitoring">
                  <Activity className="mr-2 h-4 w-4" />
                  API Monitoring
                </TabsTrigger>
                <TabsTrigger value="copilot">
                  <Bot className="mr-2 h-4 w-4" />
                  AI Co-Pilot
                </TabsTrigger>
              </TabsList>

              <TabsContent value="structure" className="mt-6">
                <BusinessStructurePanel
                  businessStructure={settings.adminConfig.businessStructure}
                  companyId={company.id}
                  canEdit={canEdit}
                  saving={saving.admin}
                  onUpdate={async (updates) => {
                    await updateAdminConfig({ businessStructure: updates });
                    await syncAdminConfigSnapshot();
                  }}
                  onRefresh={syncAdminConfigSnapshot}
                />
              </TabsContent>

              <TabsContent value="roles" className="mt-6">
                <RoleTemplatesPanel
                  roleTemplates={settings.adminConfig.roleTemplates}
                  canEdit={canEdit}
                  onSyncTemplates={async (templates) => {
                    await updateAdminConfig({ roleTemplates: templates });
                    toast({ title: 'Role templates synced' });
                  }}
                />
              </TabsContent>

              <TabsContent value="monitoring" className="mt-6">
                <ApiMonitoringPanel
                  monitoring={settings.adminConfig.apiMonitoring}
                  canEdit={canEdit}
                  saving={saving.admin}
                  onSave={async (payload) => {
                    await updateAdminConfig({ apiMonitoring: payload });
                    toast({ title: 'API monitoring updated' });
                  }}
                />
              </TabsContent>

              <TabsContent value="copilot" className="mt-6">
                <AICopilotPanel
                  copilot={settings.adminConfig.aiCopilot}
                  canEdit={canEdit}
                  saving={saving.admin}
                  onSave={async (payload) => {
                    await updateAdminConfig({ aiCopilot: payload });
                    toast({ title: 'AI Co-Pilot settings saved' });
                  }}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}

function AccessDenied() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
      <p className="mt-2 text-muted-foreground">
        You do not have sufficient permission to manage system settings.
      </p>
    </div>
  );
}

type GeneralSettingsFormProps = {
  general: GeneralSettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (payload: GeneralSettings, options?: { logoFile?: File | null }) => Promise<void>;
};

function GeneralSettingsForm({ general, canEdit, saving, onSave }: GeneralSettingsFormProps) {
  const initialState = useMemo(() => normalizeGeneralState(general), [general]);
  const [values, setValues] = useState(initialState);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(general.logoUrl);

  useEffect(() => {
    setValues(normalizeGeneralState(general));
    setLogoPreview(general.logoUrl);
    setLogoFile(null);
  }, [general]);

  const isDirty = useMemo(() => {
    const current = normalizeGeneralState({
      ...general,
      companyName: values.companyName,
      companyDescription: values.companyDescription || null,
      contactEmail: values.contactEmail || null,
      contactPhone: values.contactPhone || null,
      website: values.website || null,
      address: values.address || null,
    });
    return (
      JSON.stringify(initialState) !== JSON.stringify(current) || logoFile !== null
    );
  }, [general, initialState, values, logoFile]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setLogoFile(null);
      setLogoPreview(general.logoUrl);
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setLogoPreview(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const payload: GeneralSettings = {
      companyName: values.companyName,
      companyDescription: values.companyDescription || null,
      contactEmail: values.contactEmail || null,
      contactPhone: values.contactPhone || null,
      website: values.website || null,
      address: values.address || null,
      logoUrl: general.logoUrl,
    };

    await onSave(payload, { logoFile });
    setLogoFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>
          Manage public company details, contact info, and brand assets synced across modules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={values.companyName}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, companyName: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="FlowForce Operations"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyWebsite">Website</Label>
            <Input
              id="companyWebsite"
              value={values.website}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, website: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Primary Email</Label>
            <Input
              type="email"
              id="contactEmail"
              value={values.contactEmail}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, contactEmail: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="team@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone Number</Label>
            <Input
              id="contactPhone"
              value={values.contactPhone}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, contactPhone: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Address / HQ</Label>
            <Textarea
              id="companyAddress"
              value={values.address}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, address: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="123 Operations Ave, Suite 400"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyDescription">Company Description</Label>
            <Textarea
              id="companyDescription"
              value={values.companyDescription}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, companyDescription: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="Short mission statement or tagline"
              rows={3}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-center text-xs text-muted-foreground">
                No logo uploaded
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <Label>Company Logo</Label>
            <p className="text-sm text-muted-foreground">
              Upload a transparent PNG or SVG (max 2MB). Logo is used across dashboards, emails, and reports.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className={cn('inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-muted', !canEdit && 'cursor-not-allowed opacity-60')}>
                <UploadCloud className="h-4 w-4" />
                <span>Upload logo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/svg+xml"
                  disabled={!canEdit}
                  onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                />
              </label>
              {logoFile && (
                <Badge variant="outline">{logoFile.name}</Badge>
              )}
              {logoPreview && canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileChange(null)}
                >
                  Reset logo
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || saving || !canEdit}
            onClick={() => {
              setValues(initialState);
              setLogoFile(null);
              setLogoPreview(general.logoUrl);
            }}
          >
            Discard changes
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canEdit || !isDirty || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type SecuritySettingsPanelProps = {
  security: SecuritySettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (payload: SecuritySettings) => Promise<void>;
};

function SecuritySettingsPanel({ security, canEdit, saving, onSave }: SecuritySettingsPanelProps) {
  const [state, setState] = useState(security);

  useEffect(() => {
    setState(security);
  }, [security]);

  const isDirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(security), [state, security]);

  const handlePasswordPolicyChange = (key: keyof SecuritySettings['passwordPolicy'], value: boolean | number) => {
    setState((prev) => ({
      ...prev,
      passwordPolicy: {
        ...prev.passwordPolicy,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    await onSave(state);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Policies
        </CardTitle>
        <CardDescription>
          Enforce secure access, multi-factor authentication, and password standards for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-lg border p-4">
            <div>
              <h4 className="text-sm font-medium">Require Multi-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Enforce two-factor authentication for all team members during sign-in.
              </p>
            </div>
            <Switch
              checked={state.twoFactorRequired}
              onCheckedChange={(checked) =>
                setState((prev) => ({ ...prev, twoFactorRequired: checked }))
              }
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border p-4">
            <div>
              <h4 className="text-sm font-medium">Force 2FA for privileged roles</h4>
              <p className="text-sm text-muted-foreground">
                Automatically require MFA for admins, owners, and company administrators.
              </p>
            </div>
            <Switch
              checked={state.enforceForAdmins}
              onCheckedChange={(checked) =>
                setState((prev) => ({ ...prev, enforceForAdmins: checked }))
              }
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-semibold">Password policy</h4>
            <p className="text-xs text-muted-foreground">
              Configure minimum strength requirements enforced during password creation and reset.
            </p>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minLength">Minimum characters</Label>
                <Input
                  id="minLength"
                  type="number"
                  min={8}
                  max={32}
                  value={state.passwordPolicy.minLength}
                  onChange={(event) =>
                    handlePasswordPolicyChange('minLength', Number(event.target.value))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min={5}
                  max={720}
                  step={5}
                  value={state.sessionTimeout}
                  onChange={(event) =>
                    setState((prev) => ({ ...prev, sessionTimeout: Number(event.target.value) }))
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <PasswordPolicyToggle
                label="Require uppercase letters"
                checked={state.passwordPolicy.requireUppercase}
                onChange={(checked) => handlePasswordPolicyChange('requireUppercase', checked)}
                disabled={!canEdit}
              />
              <PasswordPolicyToggle
                label="Require lowercase letters"
                checked={state.passwordPolicy.requireLowercase}
                onChange={(checked) => handlePasswordPolicyChange('requireLowercase', checked)}
                disabled={!canEdit}
              />
              <PasswordPolicyToggle
                label="Require numbers"
                checked={state.passwordPolicy.requireNumber}
                onChange={(checked) => handlePasswordPolicyChange('requireNumber', checked)}
                disabled={!canEdit}
              />
              <PasswordPolicyToggle
                label="Require special characters"
                checked={state.passwordPolicy.requireSpecial}
                onChange={(checked) => handlePasswordPolicyChange('requireSpecial', checked)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || saving || !canEdit}
            onClick={() => setState(security)}
          >
            Discard changes
          </Button>
          <Button onClick={handleSubmit} disabled={!canEdit || !isDirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save policies'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordPolicyToggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

type LocalizationSettingsFormProps = {
  localization: LocalizationSettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (payload: LocalizationSettings) => Promise<void>;
};

function LocalizationSettingsForm({ localization, canEdit, saving, onSave }: LocalizationSettingsFormProps) {
  const initialState = useMemo(() => normalizeLocalizationState(localization), [localization]);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    setState(normalizeLocalizationState(localization));
  }, [localization]);

  const isDirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(initialState), [state, initialState]);

  const handleSubmit = async () => {
    const payload: LocalizationSettings = {
      timezone: state.timezone,
      language: state.language,
      currency: state.currency,
      regionalFormats: {
        date: state.dateFormat,
        time: state.timeFormat,
        number: state.numberFormat,
      },
    };

    await onSave(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Localization</CardTitle>
        <CardDescription>
          Align FlowForce with your organization&apos;s timezone, preferred language, and currency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={state.timezone}
              onValueChange={(value) => setState((prev) => ({ ...prev, timezone: value }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={state.language}
              onValueChange={(value) => setState((prev) => ({ ...prev, language: value }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={state.currency}
              onValueChange={(value) => setState((prev) => ({ ...prev, currency: value }))}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Date format</Label>
            <Input
              value={state.dateFormat}
              onChange={(event) =>
                setState((prev) => ({ ...prev, dateFormat: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div className="space-y-2">
            <Label>Time format</Label>
            <Input
              value={state.timeFormat}
              onChange={(event) =>
                setState((prev) => ({ ...prev, timeFormat: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="hh:mm A"
            />
          </div>
          <div className="space-y-2">
            <Label>Number format</Label>
            <Input
              value={state.numberFormat}
              onChange={(event) =>
                setState((prev) => ({ ...prev, numberFormat: event.target.value }))
              }
              disabled={!canEdit}
              placeholder="1,234.56"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || saving || !canEdit}
            onClick={() => setState(initialState)}
          >
            Discard changes
          </Button>
          <Button onClick={handleSubmit} disabled={!isDirty || saving || !canEdit}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save preferences'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type NotificationsSettingsPanelProps = {
  notifications: NotificationsSettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (payload: NotificationsSettings) => Promise<void>;
};

function NotificationsSettingsPanel({
  notifications,
  canEdit,
  saving,
  onSave,
}: NotificationsSettingsPanelProps) {
  const [channels, setChannels] = useState<string[]>(notifications.deliveryChannels);
  const [digestEnabled, setDigestEnabled] = useState(notifications.digestEnabled);
  const [digestHour, setDigestHour] = useState(notifications.digestHour.toString());
  const [moduleOverrides, setModuleOverrides] = useState<Record<string, ModuleNotificationOverride>>(
    notifications.moduleOverrides,
  );
  const [reminderWindow, setReminderWindow] = useState(
    notifications.escalations.reminderWindowMinutes.toString(),
  );

  useEffect(() => {
    setChannels(notifications.deliveryChannels);
    setDigestEnabled(notifications.digestEnabled);
    setDigestHour(String(notifications.digestHour));
    setModuleOverrides(notifications.moduleOverrides);
    setReminderWindow(String(notifications.escalations.reminderWindowMinutes));
  }, [notifications]);

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel],
    );
  };

  const handleModuleOverride = (moduleKey: string, channelKey: keyof ModuleNotificationOverride, value: boolean) => {
    setModuleOverrides((prev) => ({
      ...prev,
      [moduleKey]: {
        ...DEFAULT_OVERRIDE,
        ...(prev[moduleKey] ?? {}),
        [channelKey]: value,
      },
    }));
  };

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(channels.sort()) !== JSON.stringify([...notifications.deliveryChannels].sort()) ||
      digestEnabled !== notifications.digestEnabled ||
      digestHour !== notifications.digestHour.toString() ||
      JSON.stringify(moduleOverrides) !== JSON.stringify(notifications.moduleOverrides) ||
      reminderWindow !== notifications.escalations.reminderWindowMinutes.toString()
    );
  }, [channels, notifications, digestEnabled, digestHour, moduleOverrides, reminderWindow]);

  const handleSave = async () => {
    const payload: NotificationsSettings = {
      deliveryChannels: channels,
      digestEnabled,
      digestHour: Number(digestHour) || 8,
      moduleOverrides,
      escalations: {
        criticalModules: notifications.escalations.criticalModules,
        reminderWindowMinutes: Number(reminderWindow) || notifications.escalations.reminderWindowMinutes,
      },
    };

    await onSave(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Center</CardTitle>
        <CardDescription>
          Tailor delivery channels and module overrides for company-wide alerts and reminders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-semibold">Delivery channels</h4>
            <p className="text-xs text-muted-foreground">
              Configure which channels FlowForce uses for default company alerts.
            </p>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {NOTIFICATION_CHANNELS.map((channel) => (
              <div
                key={channel.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium capitalize">{channel.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {channel.key === 'email' && 'HTML emails with actionable summaries'}
                    {channel.key === 'in_app' && 'Feed alerts within FlowForce'}
                    {channel.key === 'sms' && 'Text message notifications'}
                    {channel.key === 'push' && 'Browser push notifications'}
                  </p>
                </div>
                <Switch
                  checked={channels.includes(channel.key)}
                  onCheckedChange={() => toggleChannel(channel.key)}
                  disabled={!canEdit}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-semibold">Daily digest</h4>
            <p className="text-xs text-muted-foreground">
              Send summary emails to managers and admins with pending actions.
            </p>
          </div>
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={digestEnabled}
                onCheckedChange={setDigestEnabled}
                disabled={!canEdit}
              />
              <div>
                <p className="text-sm font-medium">Enable digest</p>
                <p className="text-xs text-muted-foreground">
                  Sends consolidated summary once per day to stakeholders.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Send at</Label>
              <Select
                value={digestHour}
                onValueChange={setDigestHour}
                disabled={!canEdit || !digestEnabled}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 6, 7, 8, 9, 10, 12, 16, 18, 20].map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {hour}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-semibold">Module overrides</h4>
            <p className="text-xs text-muted-foreground">
              Override company defaults for specific modules and escalation paths.
            </p>
          </div>
          <Accordion type="single" collapsible className="p-2">
            {MODULE_OPTIONS.map((module) => {
              const override = moduleOverrides[module.key] ?? DEFAULT_OVERRIDE;
              return (
                <AccordionItem key={module.key} value={module.key}>
                  <AccordionTrigger>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-medium">{module.label}</span>
                      <span className="text-xs text-muted-foreground">{module.description}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3 p-3 md:grid-cols-2">
                      {NOTIFICATION_CHANNELS.map((channel) => (
                        <div
                          key={channel.key}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <span className="text-sm">{channel.label}</span>
                          <Switch
                            checked={override[channel.key as keyof ModuleNotificationOverride] ?? false}
                            onCheckedChange={(checked) =>
                              handleModuleOverride(module.key, channel.key as keyof ModuleNotificationOverride, checked)
                            }
                            disabled={!canEdit}
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-sm font-medium">Escalation reminders</h4>
              <p className="text-xs text-muted-foreground">
                Trigger reminder notifications before critical deadlines.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm">Reminder window (minutes)</Label>
              <Input
                className="w-28"
                type="number"
                min={5}
                max={240}
                value={reminderWindow}
                onChange={(event) => setReminderWindow(event.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || saving || !canEdit}
            onClick={() => {
              setChannels(notifications.deliveryChannels);
              setDigestEnabled(notifications.digestEnabled);
              setDigestHour(String(notifications.digestHour));
              setModuleOverrides(notifications.moduleOverrides);
              setReminderWindow(String(notifications.escalations.reminderWindowMinutes));
            }}
          >
            Discard changes
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || saving || !canEdit}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save notification defaults'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type IntegrationsPanelProps = {
  integrations: IntegrationsSettings;
  canEdit: boolean;
  saving: boolean;
  onConnect: (provider: string, connection: IntegrationConnection) => Promise<void>;
  onDisconnect: (provider: string) => Promise<void>;
};

function IntegrationsPanel({
  integrations,
  canEdit,
  saving,
  onConnect,
  onDisconnect,
}: IntegrationsPanelProps) {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!activeProvider) {
      setApiKey('');
      setNotes('');
    }
  }, [activeProvider]);

  const providerStatus = (providerKey: string) => {
    return integrations.providers[providerKey]?.status ?? 'disconnected';
  };

  const handleConnect = async (providerKey: string) => {
    const provider = integrationProviders.find((item) => item.key === providerKey);
    if (!provider) return;

    let connection: IntegrationConnection = {
      id: `${provider.key}-${Date.now()}`,
      provider: provider.key,
      status: provider.authType === 'oauth' ? 'pending' : 'connected',
      authType: provider.authType,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: null,
      metadata: {},
    };

    if (provider.authType === 'api_key') {
      if (!apiKey.trim()) {
        throw new Error('API key is required to connect this integration');
      }
      connection = {
        ...connection,
        metadata: { apiKey: apiKey.trim(), notes },
      };
    }

    await onConnect(provider.key, connection);
    setActiveProvider(null);
    setApiKey('');
    setNotes('');
  };

  const handleDisconnect = async (providerKey: string) => {
    await onDisconnect(providerKey);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>
            Connect third-party platforms to synchronize schedules, inventory, and payroll data.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {integrationProviders.map((provider) => {
            const status = providerStatus(provider.key);
            const isConnected = status === 'connected';
            const isPending = status === 'pending';
            return (
              <Card
                key={provider.key}
                className="border-muted shadow-sm transition hover:border-primary/40"
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <Badge
                      variant={
                        isConnected ? 'default' : isPending ? 'secondary' : 'outline'
                      }
                    >
                      {isConnected ? 'Connected' : isPending ? 'Pending' : 'Not connected'}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {provider.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Auth type: {provider.authType === 'api_key' ? 'API Key' : 'OAuth'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(provider.key)}
                        disabled={!canEdit || saving}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Dialog open={activeProvider === provider.key} onOpenChange={(open) => setActiveProvider(open ? provider.key : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" disabled={!canEdit || saving}>
                            {provider.authType === 'oauth' ? 'Start OAuth' : 'Connect'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Connect {provider.name}</DialogTitle>
                            <DialogDescription>
                              Provide the required credentials to enable the integration.
                            </DialogDescription>
                          </DialogHeader>
                          {provider.authType === 'api_key' ? (
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>API Key</Label>
                                <Input
                                  value={apiKey}
                                  onChange={(event) => setApiKey(event.target.value)}
                                  placeholder="Paste API key"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                  value={notes}
                                  onChange={(event) => setNotes(event.target.value)}
                                  placeholder="Optional context for teammates"
                                  rows={3}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 py-6 text-sm text-muted-foreground">
                              <p>
                                You will be redirected to {provider.name} to authorize FlowForce access.
                              </p>
                              <p>
                                Once approved, the integration will be activated automatically.
                              </p>
                            </div>
                          )}
                          <DialogFooter>
                            <Button
                              onClick={() => handleConnect(provider.key)}
                              disabled={saving || (provider.authType === 'api_key' && !apiKey.trim())}
                            >
                              {provider.authType === 'oauth' ? 'Continue' : 'Connect'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <a href={provider.documentation} target="_blank" rel="noreferrer">
                        View docs
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection Activity</CardTitle>
          <CardDescription>
            Track synchronization state and connection metadata for each provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.connections.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No integrations connected yet.
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Connected</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.connections.map((connection) => {
                    const provider = integrationProviders.find((item) => item.key === connection.provider);
                    const statusBadge = connection.status === 'connected' ? 'default' : connection.status === 'pending' ? 'secondary' : 'outline';
                    return (
                      <TableRow key={connection.id}>
                        <TableCell className="font-medium">{provider?.name ?? connection.provider}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadge}>{connection.status}</Badge>
                        </TableCell>
                        <TableCell>{connection.connectedAt ? new Date(connection.connectedAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>{connection.lastSyncedAt ? new Date(connection.lastSyncedAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDisconnect(connection.provider)}
                            disabled={!canEdit || saving}
                          >
                            Disconnect
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type AppearanceSettingsPanelProps = {
  appearance: AppearanceSettings;
  canEdit: boolean;
  saving: boolean;
  onPreview: (draft: AppearanceSettings) => Promise<void>;
  onCancelPreview: () => Promise<void>;
  onSave: (draft: AppearanceSettings) => Promise<void>;
};

function AppearanceSettingsPanel({
  appearance,
  canEdit,
  saving,
  onPreview,
  onCancelPreview,
  onSave,
}: AppearanceSettingsPanelProps) {
  const cloneAppearance = (value: AppearanceSettings): AppearanceSettings => ({
    ...value,
    sidebarBranding: { ...value.sidebarBranding },
    preview: { ...value.preview },
  });

  const [draft, setDraft] = useState<AppearanceSettings>(cloneAppearance(appearance));
  const [previewActive, setPreviewActive] = useState(appearance.preview.isActive);

  useEffect(() => {
    setDraft(cloneAppearance(appearance));
    setPreviewActive(appearance.preview.isActive);
  }, [appearance]);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(appearance), [draft, appearance]);

  const handleSave = async () => {
    await onSave(draft);
    setPreviewActive(false);
  };

  const handlePreview = async () => {
    await onPreview(draft);
    setPreviewActive(true);
  };

  const handleCancelPreview = async () => {
    await onCancelPreview();
    setPreviewActive(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance & Branding</CardTitle>
        <CardDescription>
          Customize theme colors, layout, and preview changes before applying company-wide.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <ColorPicker
            label="Primary color"
            value={draft.primaryColor}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                primaryColor: value,
              }))
            }
            disabled={!canEdit}
          />
          <ColorPicker
            label="Secondary color"
            value={draft.secondaryColor}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                secondaryColor: value,
              }))
            }
            disabled={!canEdit}
          />
          <ColorPicker
            label="Accent color"
            value={draft.accentColor}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                accentColor: value,
              }))
            }
            disabled={!canEdit}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select
              value={draft.theme}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  theme: value as AppearanceSettings['theme'],
                }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Logo placement</Label>
            <Select
              value={draft.logoPlacement}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  logoPlacement: value as AppearanceSettings['logoPlacement'],
                }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sidebar">Sidebar</SelectItem>
                <SelectItem value="header">Header</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dashboard layout</Label>
            <Select
              value={draft.dashboardLayout}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  dashboardLayout: value as AppearanceSettings['dashboardLayout'],
                }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Sidebar branding</Label>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Enable sidebar branding</p>
                <p className="text-xs text-muted-foreground">
                  Display company logo and colors in the sidebar.
                </p>
              </div>
              <Switch
                checked={draft.sidebarBranding.enabled}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    sidebarBranding: {
                      ...prev.sidebarBranding,
                      enabled: checked,
                    },
                  }))
                }
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sidebar style</Label>
            <Select
              value={draft.sidebarBranding.background}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  sidebarBranding: {
                    ...prev.sidebarBranding,
                    background: value as AppearanceSettings['sidebarBranding']['background'],
                  },
                }))
              }
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h4 className="text-sm font-medium">Live preview</h4>
          <p className="text-xs text-muted-foreground">
            Preview palette changes before releasing them company-wide.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-muted-foreground">Light Card</p>
              <div className="mt-3 rounded-md border p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: draft.primaryColor }}
                  />
                  <div>
                    <p className="font-medium" style={{ color: draft.primaryColor }}>
                      Primary emphasis
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Body copy and supporting text remain legible.
                    </p>
                  </div>
                </div>
                <Button className="mt-4" style={{ backgroundColor: draft.secondaryColor }}>
                  Secondary Action
                </Button>
              </div>
            </div>
            <div className="rounded-lg border bg-slate-900 p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-300">Dark Card</p>
              <div className="mt-3 rounded-md border border-slate-700 bg-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-full"
                    style={{ backgroundColor: draft.accentColor }}
                  />
                  <div>
                    <p className="font-medium text-white">
                      Accent emphasis
                    </p>
                    <p className="text-xs text-slate-400">
                      Quick action palette for dark interfaces.
                    </p>
                  </div>
                </div>
                <Button className="mt-4" variant="secondary">
                  Preview action
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {previewActive && (
            <Badge variant="outline" className="bg-amber-50 text-amber-600">
              Preview mode active
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={() => setDraft(cloneAppearance(appearance))}
            disabled={!isDirty || saving || !canEdit}
          >
            Reset changes
          </Button>
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={!canEdit || saving}
          >
            Preview theme
          </Button>
          {previewActive && (
            <Button variant="ghost" onClick={handleCancelPreview} disabled={saving}>
              Cancel preview
            </Button>
          )}
          <Button onClick={handleSave} disabled={!canEdit || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying
              </>
            ) : (
              'Save theme'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <Input
          type="color"
          className="h-10 w-16"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

type BusinessStructurePanelProps = {
  businessStructure: BusinessStructureSettings;
  companyId: string;
  canEdit: boolean;
  saving: boolean;
  onUpdate: (updates: Partial<BusinessStructureSettings>) => Promise<void>;
  onRefresh: () => Promise<void>;
};

function BusinessStructurePanel({
  businessStructure,
  companyId,
  canEdit,
  saving,
  onUpdate,
  onRefresh,
}: BusinessStructurePanelProps) {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(
    businessStructure.workingHours ?? defaultWorkingHours(),
  );
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationType, setNewLocationType] = useState('restaurant');
  const [newLocationTemp, setNewLocationTemp] = useState(false);
  const [departments, setDepartments] = useState(businessStructure.departments);

  useEffect(() => {
    setWorkingHours(businessStructure.workingHours ?? defaultWorkingHours());
    setDepartments(businessStructure.departments);
  }, [businessStructure]);

  useEffect(() => {
    const fetchLocations = async () => {
      setLocationsLoading(true);
      const { data, error } = await supabase
        .from('inv_locations')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });
      if (!error && data) {
        setLocations(data);
      }
      setLocationsLoading(false);
    };

    fetchLocations();
  }, [companyId]);

  const updateWorkingHour = (day: WorkingDayKey, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveWorkingHours = async () => {
    await supabase
      .from('companies')
      .update({ working_hours: workingHours })
      .eq('id', companyId);
    await onUpdate({
      workingHours,
    });
  };

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) return;
    const { data, error } = await supabase
      .from('inv_locations')
      .insert({
        company_id: companyId,
        name: newLocationName.trim(),
        location_type: newLocationType,
        temperature_controlled: newLocationTemp,
      })
      .select()
      .single();

    if (!error && data) {
      setLocations((prev) => [...prev, data]);
      await onUpdate({
        locations: [...locations, {
          id: data.id,
          name: data.name,
          location_type: data.location_type,
          temperature_controlled: data.temperature_controlled,
          is_active: data.is_active,
        }],
      });
      setNewLocationName('');
      setNewLocationTemp(false);
      setNewLocationType('restaurant');
    }
  };

  const toggleLocationActive = async (location: InventoryLocation, isActive: boolean) => {
    await supabase
      .from('inv_locations')
      .update({ is_active: isActive })
      .eq('id', location.id);

    setLocations((prev) => {
      const updated = prev.map((item) =>
        item.id === location.id ? { ...item, is_active: isActive } : item,
      );
      void onUpdate({
        locations: updated.map((item) => ({
          id: item.id,
          name: item.name,
          location_type: item.location_type,
          temperature_controlled: item.temperature_controlled,
          is_active: item.is_active,
        })),
      });
      return updated;
    });
  };

  const handleSaveDepartments = async () => {
    await onUpdate({
      departments,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>
            Define default business hours used across scheduling, availability, and analytics modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {WORKING_DAYS.map((day) => {
              const dayConfig = workingHours[day];
              const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);
              return (
                <div key={day} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={dayConfig.enabled}
                        onCheckedChange={(checked) =>
                          updateWorkingHour(day, 'enabled', checked)
                        }
                        disabled={!canEdit}
                      />
                      <span className="text-sm font-medium">{dayLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={dayConfig.start}
                        onChange={(event) =>
                          updateWorkingHour(day, 'start', event.target.value)
                        }
                        disabled={!canEdit || !dayConfig.enabled}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={dayConfig.end}
                        onChange={(event) =>
                          updateWorkingHour(day, 'end', event.target.value)
                        }
                        disabled={!canEdit || !dayConfig.enabled}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={saving || !canEdit}
              onClick={() => setWorkingHours(businessStructure.workingHours ?? defaultWorkingHours())}
            >
              Reset
            </Button>
            <Button onClick={handleSaveWorkingHours} disabled={saving || !canEdit}>
              Save hours
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            Manage inventory and scheduling locations to keep data segmented accurately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Location name"
              value={newLocationName}
              onChange={(event) => setNewLocationName(event.target.value)}
              disabled={!canEdit}
            />
            <Select
              value={newLocationType}
              onValueChange={setNewLocationType}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LOCATIONS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                checked={newLocationTemp}
                onCheckedChange={setNewLocationTemp}
                disabled={!canEdit}
              />
              <Label className="text-sm">Temperature controlled</Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddLocation} disabled={!canEdit || !newLocationName.trim()}>
              Add location
            </Button>
          </div>
          <Separator />
          <div className="space-y-3">
            {locationsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading locations…
              </div>
            ) : locations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No locations configured yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Temperature</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.location_type}</TableCell>
                      <TableCell>{location.temperature_controlled ? 'Controlled' : 'Ambient'}</TableCell>
                      <TableCell>
                        <Badge variant={location.is_active ? 'default' : 'secondary'}>
                          {location.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={location.is_active ?? true}
                          onCheckedChange={(checked) => toggleLocationActive(location, checked)}
                          disabled={!canEdit}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
          <CardDescription>
            Define high-level departments to categorize positions, sections, and analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {departments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No departments defined. Add departments to organize teams and reporting.
              </div>
            ) : (
              departments.map((department) => (
                <div key={department.id} className="rounded-lg border p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">{department.name}</p>
                      {department.description && (
                        <p className="text-xs text-muted-foreground">{department.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDepartments((prev) => prev.filter((item) => item.id !== department.id))
                      }
                      disabled={!canEdit}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="w-64"
              placeholder="Department name"
              disabled={!canEdit}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canEdit) {
                  event.preventDefault();
                  const input = event.target as HTMLInputElement;
                  const value = input.value.trim();
                  if (value) {
                    setDepartments((prev) => [
                      ...prev,
                      { id: `dept-${Date.now()}`, name: value, type: 'operations', description: '' },
                    ]);
                    input.value = '';
                  }
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepartments((prev) => [
                ...prev,
                { id: `dept-${Date.now()}`, name: 'New Department', type: 'operations', description: '' },
              ])}
              disabled={!canEdit}
            >
              Quick add
            </Button>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveDepartments} disabled={!canEdit || saving}>
              Save departments
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Ensure business structure stays synchronized to power scheduling rules and analytics breakdowns.
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          Refresh snapshot
        </Button>
      </div>
    </div>
  );
}

type RoleTemplatesPanelProps = {
  roleTemplates: AdminConfigurationSettings['roleTemplates'];
  canEdit: boolean;
  onSyncTemplates: (templates: AdminConfigurationSettings['roleTemplates']) => Promise<void>;
};

function RoleTemplatesPanel({ roleTemplates, canEdit, onSyncTemplates }: RoleTemplatesPanelProps) {
  const { roles, loading, refetchRoles } = useCompanyRolesSnapshot();

  const handleSync = async () => {
    await onSyncTemplates(roles);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Templates</CardTitle>
        <CardDescription>
          Manage default role blueprints and synchronize with current company roles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {roles.length} active roles detected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refetchRoles}>
              Refresh roles
            </Button>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={!canEdit || loading || roles.length === 0}
            >
              Sync current roles as templates
            </Button>
          </div>
        </div>
        <Separator />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
          </div>
        ) : roles.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            No company roles found. Once roles are created, you can sync them here as templates.
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hierarchy</TableHead>
                  <TableHead>System role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.hierarchy_level}</TableCell>
                    <TableCell>{role.is_system_role ? 'System' : 'Custom'}</TableCell>
                    <TableCell>
                      <Badge variant={role.is_active ? 'default' : 'secondary'}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
        <Separator />
        <div>
          <h4 className="text-sm font-semibold">Existing templates</h4>
          <p className="text-xs text-muted-foreground">Currently stored in admin configuration snapshot.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {roleTemplates.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No templates stored yet. Sync roles to capture a baseline configuration.
              </div>
            ) : (
              roleTemplates.map((template) => (
                <div key={template.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{template.name}</span>
                    <Badge variant="outline">Level {template.hierarchy_level}</Badge>
                  </div>
                  {template.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function useCompanyRolesSnapshot() {
  const { roles, loading, refetchRoles } = useCompanyRoles();
  return { roles, loading, refetchRoles };
}

type ApiMonitoringPanelProps = {
  monitoring: ApiMonitoringSettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (payload: ApiMonitoringSettings) => Promise<void>;
};

function ApiMonitoringPanel({ monitoring, canEdit, saving, onSave }: ApiMonitoringPanelProps) {
  const [webhookUrl, setWebhookUrl] = useState(monitoring.webhookUrl ?? '');
  const [errorRate, setErrorRate] = useState(monitoring.alertThresholds.errorRate.toString());
  const [latency, setLatency] = useState(monitoring.alertThresholds.latencyMs.toString());

  useEffect(() => {
    setWebhookUrl(monitoring.webhookUrl ?? '');
    setErrorRate(monitoring.alertThresholds.errorRate.toString());
    setLatency(monitoring.alertThresholds.latencyMs.toString());
  }, [monitoring]);

  const isDirty = useMemo(() => {
    return (
      webhookUrl !== (monitoring.webhookUrl ?? '') ||
      errorRate !== monitoring.alertThresholds.errorRate.toString() ||
      latency !== monitoring.alertThresholds.latencyMs.toString()
    );
  }, [webhookUrl, monitoring, errorRate, latency]);

  const handleSave = async () => {
    await onSave({
      webhookUrl: webhookUrl || null,
      alertThresholds: {
        errorRate: Number(errorRate) || monitoring.alertThresholds.errorRate,
        latencyMs: Number(latency) || monitoring.alertThresholds.latencyMs,
      },
      lastAlertAt: monitoring.lastAlertAt,
      recent: monitoring.recent,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Usage Monitoring</CardTitle>
        <CardDescription>
          Configure alert thresholds and webhooks for integration performance tracking.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Alert webhook URL</Label>
            <Input
              placeholder="https://hooks.zapier.com/…"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              Send integration health alerts to an external system (optional).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Error rate threshold (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={errorRate}
              onChange={(event) => setErrorRate(event.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Latency threshold (ms)</Label>
            <Input
              type="number"
              min={500}
              value={latency}
              onChange={(event) => setLatency(event.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b px-4 py-3">
            <h4 className="text-sm font-medium">Recent events</h4>
            <p className="text-xs text-muted-foreground">Captures integration activity and anomaly alerts.</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {monitoring.recent && monitoring.recent.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoring.recent.map((event) => (
                    <TableRow key={`${event.provider}-${event.timestamp}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{event.provider}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.status === 'error'
                              ? 'destructive'
                              : event.status === 'warning'
                                ? 'secondary'
                                : 'default'
                          }
                        >
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.message ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No recent events recorded.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || saving || !canEdit}
            onClick={() => {
              setWebhookUrl(monitoring.webhookUrl ?? '');
              setErrorRate(monitoring.alertThresholds.errorRate.toString());
              setLatency(monitoring.alertThresholds.latencyMs.toString());
            }}
          >
            Discard changes
          </Button>
          <Button onClick={handleSave} disabled={!canEdit || !isDirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save monitoring rules'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type AICopilotPanelProps = {
  copilot: AICopilotSettings;
  canEdit: boolean;
  saving: boolean;
  onSave: (payload: AICopilotSettings) => Promise<void>;
};

function AICopilotPanel({ copilot, canEdit, saving, onSave }: AICopilotPanelProps) {
  const [enabled, setEnabled] = useState(copilot.enabled);
  const [scopes, setScopes] = useState<string[]>(copilot.scopes);
  const [restricted, setRestricted] = useState<string[]>(copilot.restrictedModules);
  const [automationLevel, setAutomationLevel] = useState<AICopilotSettings['automationLevel']>(copilot.automationLevel ?? 'suggestion');

  useEffect(() => {
    setEnabled(copilot.enabled);
    setScopes(copilot.scopes);
    setRestricted(copilot.restrictedModules);
    setAutomationLevel(copilot.automationLevel ?? 'suggestion');
  }, [copilot]);

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope],
    );
  };

  const toggleRestriction = (scope: string) => {
    setRestricted((prev) =>
      prev.includes(scope) ? prev.filter((item) => item !== scope) : [...prev, scope],
    );
  };

  const isDirty = useMemo(() => {
    return (
      enabled !== copilot.enabled ||
      JSON.stringify(scopes.sort()) !== JSON.stringify([...copilot.scopes].sort()) ||
      JSON.stringify(restricted.sort()) !== JSON.stringify([...copilot.restrictedModules].sort()) ||
      automationLevel !== copilot.automationLevel
    );
  }, [enabled, scopes, restricted, automationLevel, copilot]);

  const handleSave = async () => {
    await onSave({
      enabled,
      scopes,
      restrictedModules: restricted,
      automationLevel,
      lastAuditAt: copilot.lastAuditAt,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Co-Pilot Configuration</CardTitle>
        <CardDescription>
          Define automation boundaries for FlowForce&apos;s AI assistive workflows and suggestions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Enable AI Co-Pilot automation</p>
            <p className="text-xs text-muted-foreground">
              Allow FlowForce to generate proactive suggestions and optional automations.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-3">
          <Label>Automation level</Label>
          <Select
            value={automationLevel ?? 'suggestion'}
            onValueChange={(value) => setAutomationLevel(value as AICopilotSettings['automationLevel'])}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suggestion">Suggestions only</SelectItem>
              <SelectItem value="assist">Assist (requires approval)</SelectItem>
              <SelectItem value="autopilot">Autopilot (auto-execute within scopes)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Allowed scopes</Label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_COPILOT_SCOPES.map((scope) => {
              const active = scopes.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  disabled={!canEdit}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-muted bg-muted text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {scope}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Restricted modules</Label>
          <p className="text-xs text-muted-foreground">
            Select modules where AI automations should be disabled regardless of automation tier.
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_COPILOT_SCOPES.map((scope) => {
              const active = restricted.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleRestriction(scope)}
                  disabled={!canEdit}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition',
                    active
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-muted bg-muted text-muted-foreground hover:border-destructive/40',
                  )}
                >
                  {scope}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>
            Last automation audit: {copilot.lastAuditAt ? new Date(copilot.lastAuditAt).toLocaleString() : 'No audits recorded'}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || saving || !canEdit}
            onClick={() => {
              setEnabled(copilot.enabled);
              setScopes(copilot.scopes);
              setRestricted(copilot.restrictedModules);
              setAutomationLevel(copilot.automationLevel ?? 'suggestion');
            }}
          >
            Discard changes
          </Button>
          <Button onClick={handleSave} disabled={!canEdit || !isDirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save AI configuration'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
