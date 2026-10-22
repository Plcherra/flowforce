import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ErrorState } from "./ErrorState";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useSecuritySettings } from "../hooks/useSecuritySettings";
import { useTranslation } from "react-i18next";

export function SecuritySettingsPanel() {
  const { t } = useTranslation();
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
  } = useSecuritySettings(system);

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.securityAccessControls")}</CardTitle>
        <CardDescription>{t("settings.controlHowTheTeamSignsInAndHow")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("settings.enforceMultiFactorAuthentication")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.requireVerifiedAuthenticatorAppsOrPasskeysForAll")}</p>
            </div>
            <Switch
              checked={state.twoFactorRequired}
              onCheckedChange={(value) =>
                setState((prev) => ({ ...prev, twoFactorRequired: value }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">{t("settings.adminsMustUseMfa")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.automaticallyEnforceMfaForOwnersCompanyAdminsAnd")}</p>
            </div>
            <Switch
              checked={state.enforceForAdmins}
              onCheckedChange={(value) =>
                setState((prev) => ({ ...prev, enforceForAdmins: value }))
              }
              disabled={!canEdit || loading}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">{t("settings.passwordPolicy")}</h3>
            <Badge variant="outline">
              min {state.passwordPolicy.minLength} chars
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password-min-length">{t("settings.minimumLength")}</Label>
              <Input
                id="password-min-length"
                type="number"
                min={8}
                max={64}
                value={state.passwordPolicy.minLength}
                onChange={(event) =>
                  updatePasswordPolicy(
                    "minLength",
                    Number(event.target.value) ||
                      state.passwordPolicy.minLength,
                  )
                }
                disabled={!canEdit || loading}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                ["requireUppercase", "Uppercase"],
                ["requireLowercase", "Lowercase"],
                ["requireNumber", "Number"],
                ["requireSpecial", "Special character"],
              ].map(([key, label]) => {
                const typedKey = key as keyof typeof state.passwordPolicy;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      state.passwordPolicy[typedKey]
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                    } ${(!canEdit || loading) && "cursor-not-allowed opacity-60"}`}
                    onClick={() =>
                      updatePasswordPolicy(
                        typedKey,
                        !state.passwordPolicy[typedKey],
                      )
                    }
                    disabled={!canEdit || loading}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="idle-sign-out">{t("settings.signOutIdleStaff")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.afterThisTimeOnASharedTabletOr")}</p>
            </div>
            <Switch
              id="idle-sign-out"
              checked={state.sessionTimeout > 0}
              onCheckedChange={(checked) =>
                setState((prev) => ({
                  ...prev,
                  sessionTimeout: checked
                    ? prev.sessionTimeout > 0
                      ? prev.sessionTimeout
                      : 30
                    : 0,
                }))
              }
              disabled={!canEdit || loading}
            />
          </div>
          {state.sessionTimeout > 0 ? (
            <div className="flex max-w-xs items-center gap-2">
              <Input
                id="session-timeout"
                type="number"
                min={0}
                max={480}
                value={state.sessionTimeout}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setState((prev) => ({
                    ...prev,
                    sessionTimeout: Number.isFinite(next)
                      ? Math.min(480, Math.max(0, Math.trunc(next)))
                      : prev.sessionTimeout,
                  }));
                }}
                onBlur={() =>
                  setState((prev) => ({
                    ...prev,
                    sessionTimeout:
                      prev.sessionTimeout <= 0
                        ? 0
                        : Math.min(480, Math.max(5, prev.sessionTimeout)),
                  }))
                }
                disabled={!canEdit || loading}
              />
              <span className="text-sm text-muted-foreground">{t("settings.minutes")}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("settings.idleSignOutIsOff")}</p>
          )}
        </section>

        {saveError && <ErrorState message={saveError.message} />}

        <Separator />

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!dirty || saving || !canEdit}
            onClick={reset}
          >{t("settings.discard")}</Button>
          <Button
            onClick={save}
            disabled={!canEdit || !dirty || saving || loading}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("settings.saving")}</>
            ) : (
              t("settings.saveSecurityPolicies")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
