import { useMemo } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildSettingsReadinessSummary } from "@/features/system/utils/settingsReadiness";
import { useSystemSettingsContext } from "@/features/system/hooks/SystemSettingsContext";

interface SettingsReadinessPanelProps {
  onOpenAdmin: () => void;
  onOpenIntegrations: () => void;
}

const statusTone: Record<string, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
  watch:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  blocked: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
};

const reviewTone: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
};

export function SettingsReadinessPanel({
  onOpenAdmin,
  onOpenIntegrations,
}: SettingsReadinessPanelProps) {
  const { settings, canEdit } = useSystemSettingsContext();
  const summary = useMemo(
    () => (settings ? buildSettingsReadinessSummary(settings) : null),
    [settings],
  );

  if (!summary) return null;

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Settings Readiness
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Company profile, permissions, integrations, feature gates, high-risk actions, and audit coverage.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={summary.completionScore >= 80 ? "default" : "secondary"}>
              {summary.completionScore}% complete
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenIntegrations}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Integrations
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onOpenAdmin}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Audit & Admin
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {summary.cards.map((card) => (
            <div
              key={card.id}
              className={`rounded-lg border p-3 ${statusTone[card.status]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase">{card.label}</p>
                <Badge variant="outline" className="text-[10px] capitalize">
                  {card.status}
                </Badge>
              </div>
              <p className="mt-2 text-xl font-semibold">{card.value}</p>
              <p className="line-clamp-2 text-xs opacity-80">{card.detail}</p>
            </div>
          ))}
        </div>

        {summary.reviewItems.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Settings review needed</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {summary.reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md border px-3 py-2 text-sm ${reviewTone[item.severity]}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
            Settings are configured with admin-safe defaults and audit coverage.
          </div>
        )}

        {!canEdit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
            Read-only users can review readiness, but only admins can save changes.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
