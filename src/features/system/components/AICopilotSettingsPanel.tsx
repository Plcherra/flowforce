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

const SCOPE_OPTIONS = [
  "scheduling",
  "tasks",
  "inventory",
  "finance",
  "hr",
  "learning",
];

export function AICopilotSettingsPanel() {
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
        <CardTitle>AI Co-Pilot</CardTitle>
        <CardDescription>
          Configure automation boundaries and scope access for AI-enabled
          workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Enable AI Co-Pilot automation
            </p>
            <p className="text-xs text-muted-foreground">
              Allow FlowForce to generate proactive suggestions with optional
              execution.
            </p>
          </div>
          <Switch
            checked={state.enabled}
            onCheckedChange={updateEnabled}
            disabled={!canEdit || loading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Automation level
            </label>
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
                <SelectItem value="suggestion">Suggestions only</SelectItem>
                <SelectItem value="assist">Assist (requires review)</SelectItem>
                <SelectItem value="autopilot">Autopilot</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Last audit
            </label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {state.lastAuditAt
                ? new Date(state.lastAuditAt).toLocaleString()
                : "No audits yet"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Allowed scopes</p>
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
          <p className="text-sm font-medium text-foreground">
            Restricted modules
          </p>
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
          >
            Discard
          </Button>
          <Button onClick={save} disabled={!canEdit || !dirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save AI settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
