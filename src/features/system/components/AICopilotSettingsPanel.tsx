import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorState } from "./ErrorState";
import { useAICopilotSettings } from "../hooks/useAICopilotSettings";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { useTranslation } from "react-i18next";

const SCOPE_OPTIONS = [
  "scheduling",
  "tasks",
  "inventory",
  "finance",
  "hr",
  "learning",
];

export function AICopilotSettingsPanel() {
  const { t } = useTranslation();
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    state,
    toggleScope,
    toggleRestriction,
    updateAutomationLevel,
    updateEnabled,
    dirty,
    saving,
    save,
    reset,
    saveError,
  } = useAICopilotSettings(system);

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.aiCoPilot")}</CardTitle>
        <CardDescription>{t("settings.configureAutomationBoundariesAndScopeAccessForAi")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">{t("settings.enableAiCoPilotAutomation")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.allowFlowforceToGenerateProactiveSuggestionsWithOptional")}</p>
          </div>
          <Switch
            checked={state.enabled}
            onCheckedChange={updateEnabled}
            disabled={!canEdit || loading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("settings.automationLevel")}</label>
            <Select
              value={state.automationLevel ?? "suggestion"}
              onValueChange={(value) =>
                updateAutomationLevel(value as typeof state.automationLevel)
              }
              disabled={!canEdit || loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestion">{t("settings.suggestionsOnly")}</SelectItem>
                <SelectItem value="assist">{t("settings.assistRequiresReview")}</SelectItem>
                <SelectItem value="autopilot">{t("settings.autopilot")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t("settings.lastAudit")}</label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {state.lastAuditAt
                ? new Date(state.lastAuditAt).toLocaleString()
                : "No audits yet"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("settings.allowedScopes")}</p>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((scope) => {
              const active = state.scopes.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  disabled={!canEdit || loading}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground",
                    (!canEdit || loading) && "cursor-not-allowed opacity-60",
                  )}
                >
                  {scope}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{t("settings.restrictedModules")}</p>
          <div className="flex flex-wrap gap-2">
            {SCOPE_OPTIONS.map((scope) => {
              const restricted = state.restrictedModules.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleRestriction(scope)}
                  disabled={!canEdit || loading}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    restricted
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : "border-muted-foreground/30 text-muted-foreground",
                    (!canEdit || loading) && "cursor-not-allowed opacity-60",
                  )}
                >
                  {restricted ? "Blocked: " : "Allow: "}
                  <Badge variant="outline" className="ml-1">
                    {scope}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {saveError && <ErrorState message={saveError.message} />}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!dirty || saving || !canEdit}
            onClick={reset}
          >{t("settings.discard")}</Button>
          <Button onClick={save} disabled={!canEdit || !dirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("settings.saving")}</>
            ) : (
              t("settings.saveAiSettings")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
