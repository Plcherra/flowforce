import { Profiler, ReactNode, useState } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { SystemSettingsContext } from '../hooks/SystemSettingsContext';
import { useSystemSettings } from '../hooks/useSystemSettings';

type TabConfig = {
  key: string;
  label: string;
  content: ReactNode;
};

type SystemSettingsLayoutProps = {
  tabs: TabConfig[];
};

export function SystemSettingsLayout({ tabs }: SystemSettingsLayoutProps) {
  const system = useSystemSettings();
  const { company, settings, loading, error, refresh, canEdit, role, isCompanyAdmin } = system;

  const [activeTab, setActiveTab] = useState(() => tabs[0]?.key ?? '');

  const hasTabs = tabs.length > 0;

  const handleProfilerRender = (id: string, phase: 'mount' | 'update', actualDuration: number) => {
    if (import.meta.env.DEV) {
      console.debug(`[system-settings] ${id} ${phase} render: ${actualDuration.toFixed(1)}ms`);
    }
    if (typeof performance !== 'undefined' && 'mark' in performance) {
      performance.mark(`system-settings:${id}:${phase}`);
    }
  };

  const fallback = (
    <EmptyState
      title="No settings available"
      description="We couldn’t find any system settings for this company."
      action={
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <RoleGuard roles={['admin', 'company_admin', 'owner', 'manager']} fallback={fallback}>
        <div className="flex h-full items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading system settings…</p>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard roles={['admin', 'company_admin', 'owner', 'manager']} fallback={fallback}>
        <ErrorState message={error.message} onRetry={refresh} />
      </RoleGuard>
    );
  }

  if (!settings || !company) {
    return (
      <RoleGuard roles={['admin', 'company_admin', 'owner', 'manager']} fallback={fallback}>
        {fallback}
      </RoleGuard>
    );
  }

  return (
    <RoleGuard roles={['admin', 'company_admin', 'owner', 'manager']} fallback={fallback}>
      <SystemSettingsContext.Provider value={system}>
        <div className="space-y-6 p-6 md:p-10">
          <header className="flex flex-col gap-4 rounded-xl bg-muted/40 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <SettingsIcon className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-semibold text-foreground">System Settings</h1>
                  <p className="text-sm text-muted-foreground">
                    Configure company profile, governance, and automation controls.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{company.name}</Badge>
                <Badge variant={canEdit ? 'default' : 'secondary'}>
                  {canEdit ? 'Admin access' : 'Read-only'}
                </Badge>
                {role && <Badge variant="ghost">Role: {role}</Badge>}
                {isCompanyAdmin && <Badge variant="ghost">Company Admin</Badge>}
              </div>
            </div>
            <Button variant="outline" onClick={refresh}>
              Refresh data
            </Button>
          </header>

          {hasTabs ? (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
              <TabsList className="flex w-full flex-wrap gap-2">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.key} value={tab.key}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <Profiler key={tab.key} id={`settings-${tab.key}`} onRender={handleProfilerRender}>
                  <TabsContent value={tab.key} className="mt-6">
                    {tab.content}
                  </TabsContent>
                </Profiler>
              ))}
            </Tabs>
          ) : (
            fallback
          )}
        </div>
      </SystemSettingsContext.Provider>
    </RoleGuard>
  );
}
