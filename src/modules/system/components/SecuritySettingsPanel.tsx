import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { ErrorState } from './ErrorState';
import { useSystemSettingsContext } from '../hooks/SystemSettingsContext';
import { useSecuritySettings } from '../hooks/useSecuritySettings';

export function SecuritySettingsPanel() {
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    state,
    setState,
    dirty,
    saving,
    saveError,
    save,
    reset,
    updatePasswordPolicy,
    updateTokenAccess,
    updateRowLevelSecurity,
  } = useSecuritySettings(system);

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security & Access Controls</CardTitle>
        <CardDescription>
          Define authentication requirements, password resilience, and secure data access policies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enforce multi-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                Require verified authenticator apps or passkeys for all user sign-ins.
              </p>
            </div>
            <Switch
              checked={state.twoFactorRequired}
              onCheckedChange={(value) => setState((prev) => ({ ...prev, twoFactorRequired: value }))}
              disabled={!canEdit || loading}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Admins must use MFA</p>
              <p className="text-xs text-muted-foreground">
                Automatically enforce MFA for owners, company admins, and managers.
              </p>
            </div>
            <Switch
              checked={state.enforceForAdmins}
              onCheckedChange={(value) => setState((prev) => ({ ...prev, enforceForAdmins: value }))}
              disabled={!canEdit || loading}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Password policy</h3>
            <Badge variant="outline">min {state.passwordPolicy.minLength} chars</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password-min-length">Minimum length</Label>
              <Input
                id="password-min-length"
                type="number"
                min={8}
                max={64}
                value={state.passwordPolicy.minLength}
                onChange={(event) =>
                  updatePasswordPolicy('minLength', Number(event.target.value) || state.passwordPolicy.minLength)
                }
                disabled={!canEdit || loading}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                ['requireUppercase', 'Uppercase'],
                ['requireLowercase', 'Lowercase'],
                ['requireNumber', 'Number'],
                ['requireSpecial', 'Special character'],
              ].map(([key, label]) => {
                const typedKey = key as keyof typeof state.passwordPolicy;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      state.passwordPolicy[typedKey]
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    } ${(!canEdit || loading) && 'cursor-not-allowed opacity-60'}`}
                    onClick={() => updatePasswordPolicy(typedKey, !state.passwordPolicy[typedKey])}
                    disabled={!canEdit || loading}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="session-timeout">Idle session timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              min={5}
              max={480}
              value={state.sessionTimeout}
              onChange={(event) =>
                setState((prev) => ({ ...prev, sessionTimeout: Number(event.target.value) || prev.sessionTimeout }))
              }
              disabled={!canEdit || loading}
            />
            <p className="text-xs text-muted-foreground">
              Users will be logged out after inactivity to protect sensitive data.
            </p>
          </div>
          <div className="space-y-2 rounded-lg border p-4">
            <Label htmlFor="trusted-devices">Trusted device window (days)</Label>
            <Input
              id="trusted-devices"
              type="number"
              min={1}
              max={60}
              value={state.trustedDeviceWindow}
              onChange={(event) =>
                setState((prev) => ({
                  ...prev,
                  trustedDeviceWindow: Number(event.target.value) || prev.trustedDeviceWindow,
                }))
              }
              disabled={!canEdit || loading}
            />
            <p className="text-xs text-muted-foreground">
              After this window, users must complete MFA again on trusted devices.
            </p>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">API token access</p>
              <p className="text-xs text-muted-foreground">
                Manage service tokens for automation and data ingestion.
              </p>
            </div>
            <Switch
              checked={state.apiTokenAccess.enabled}
              onCheckedChange={(value) => updateTokenAccess('enabled', value)}
              disabled={!canEdit || loading}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="token-rotation">Rotate tokens every (days)</Label>
              <Input
                id="token-rotation"
                type="number"
                min={7}
                max={365}
                value={state.apiTokenAccess.rotateEveryDays}
                onChange={(event) =>
                  updateTokenAccess('rotateEveryDays', Number(event.target.value) || state.apiTokenAccess.rotateEveryDays)
                }
                disabled={!canEdit || loading || !state.apiTokenAccess.enabled}
              />
            </div>
            <div className="space-y-1">
              <Label>Last rotation</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {state.apiTokenAccess.lastRotatedAt
                  ? new Date(state.apiTokenAccess.lastRotatedAt).toLocaleString()
                  : 'No rotation recorded'}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Row-level security</p>
              <p className="text-xs text-muted-foreground">
                Restrict data access by tenant across analytics and exports.
              </p>
            </div>
            <Switch
              checked={state.rowLevelSecurity.enforced}
              onCheckedChange={(value) => updateRowLevelSecurity('enforced', value)}
              disabled={!canEdit || loading}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-xs text-muted-foreground">Allow external analytics access</span>
            <Switch
              checked={state.rowLevelSecurity.allowExternalAnalytics}
              onCheckedChange={(value) => updateRowLevelSecurity('allowExternalAnalytics', value)}
              disabled={!canEdit || loading || !state.rowLevelSecurity.enforced}
            />
          </div>
        </section>

        {saveError && <ErrorState message={saveError.message} />}

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={!dirty || saving || !canEdit} onClick={reset}>
            Discard
          </Button>
          <Button onClick={save} disabled={!canEdit || !dirty || saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              'Save security policies'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
