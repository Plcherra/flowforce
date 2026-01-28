import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { ModuleNotificationOverride } from "@/types/system-settings";
import { ErrorState } from "./ErrorState";
import { useSystemNotifications } from "../hooks/useSystemNotifications";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { cn } from "@/lib/utils";

const NOTIFICATION_CHANNELS: Array<{
  key: "email" | "in_app" | "sms" | "push";
  label: string;
}> = [
  { key: "email", label: "Email" },
  { key: "in_app", label: "In-app" },
  { key: "sms", label: "SMS" },
  { key: "push", label: "Push" },
];

const MODULE_OPTIONS: Array<{
  key: string;
  label: string;
  description: string;
}> = [
  {
    key: "scheduling",
    label: "Scheduling",
    description: "Shift updates and confirmations",
  },
  {
    key: "tasks",
    label: "Tasks",
    description: "Assignments and due reminders",
  },
  {
    key: "payments",
    label: "Payments",
    description: "Expense approvals and payouts",
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Counts, orders, and transfers",
  },
  {
    key: "announcements",
    label: "Announcements",
    description: "Company-wide updates",
  },
];

export function NotificationSettingsPanel() {
  const system = useSystemSettingsContext();
  const {
    loading,
    globalError,
    canEdit,
    channels,
    toggleChannel,
    digestEnabled,
    setDigestEnabled,
    digestHour,
    setDigestHour,
    moduleOverrides,
    toggleModuleChannel,
    reminderWindow,
    setReminderWindow,
    saving,
    save,
    reset,
    dirty,
    saveError,
  } = useSystemNotifications(system);

  const modules = useMemo(() => MODULE_OPTIONS, []);

  if (globalError) {
    return <ErrorState message={globalError.message} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Center</CardTitle>
        <CardDescription>
          Choose delivery channels and overrides for each product module.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Delivery channels
          </h3>
          <div className="flex flex-wrap gap-3">
            {NOTIFICATION_CHANNELS.map((channel) => {
              const active = channels.includes(channel.key);
              return (
                <button
                  key={channel.key}
                  type="button"
                  onClick={() => toggleChannel(channel.key)}
                  disabled={!canEdit || loading}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground",
                    (!canEdit || loading) && "cursor-not-allowed opacity-60",
                  )}
                >
                  {channel.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Daily digest
              </span>
              <Switch
                checked={digestEnabled}
                onCheckedChange={setDigestEnabled}
                disabled={!canEdit || loading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Send a bundled summary email during quiet hours.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Digest hour (24h)
            </label>
            <Input
              type="number"
              min={0}
              max={23}
              value={digestHour}
              onChange={(event) => setDigestHour(event.target.value)}
              disabled={!canEdit || loading || !digestEnabled}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Reminder window (minutes)
            </label>
            <Input
              type="number"
              min={5}
              max={240}
              value={reminderWindow}
              onChange={(event) => setReminderWindow(event.target.value)}
              disabled={!canEdit || loading}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Per-module overrides
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => {
              const override =
                moduleOverrides[module.key] ??
                ({} as ModuleNotificationOverride);
              return (
                <div key={module.key} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {module.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                    <Badge variant="outline">Module</Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {NOTIFICATION_CHANNELS.map((channel) => (
                      <button
                        key={channel.key}
                        type="button"
                        disabled={!canEdit || loading}
                        onClick={() =>
                          toggleModuleChannel(
                            module.key,
                            channel.key,
                            !(override[channel.key] ?? false),
                          )
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition",
                          override[channel.key]
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/30 text-muted-foreground",
                          (!canEdit || loading) &&
                            "cursor-not-allowed opacity-60",
                        )}
                      >
                        {channel.label}
                      </button>
                    ))}
                  </div>
                </div>
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
              "Save notifications"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
