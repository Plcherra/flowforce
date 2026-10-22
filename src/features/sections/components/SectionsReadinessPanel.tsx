import { useMemo } from "react";
import {
  AlertTriangle,
  FileText,
  Layers,
  LayoutTemplate,
  ShieldCheck,
  ToggleRight,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AVAILABLE_SECTIONS } from "@/data/availableSections";
import { useCustomSections } from "@/hooks/useCustomSections";
import { buildSectionsReadinessSummary } from "@/features/sections/utils/sectionsReadiness";

interface SectionsReadinessPanelProps {
  onAddSection: () => void;
}

const reviewTone: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  warning:
    "border-warning/40 bg-warning-muted text-warning-foreground",
  info: "border-primary/40 bg-primary/10 text-primary",
};

export function SectionsReadinessPanel({
  onAddSection,
}: SectionsReadinessPanelProps) {
  const { sections: customSections, loading } = useCustomSections();
  const summary = useMemo(
    () =>
      buildSectionsReadinessSummary({
        coreSections: AVAILABLE_SECTIONS.length,
        customSections,
      }),
    [customSections],
  );

  const cards = [
    {
      label: "Core sections",
      value: summary.coreSections,
      detail: "Built-in modules",
      icon: Layers,
    },
    {
      label: "Custom sections",
      value: loading ? "..." : summary.customSections,
      detail: `${summary.activeCustomSections} active`,
      icon: LayoutTemplate,
    },
    {
      label: "Pages",
      value: summary.customPages,
      detail: `${summary.sectionsWithoutPages} missing`,
      icon: FileText,
    },
    {
      label: "Permissions",
      value: summary.activeCustomSections - summary.sectionsWithoutPermissions,
      detail: `${summary.sectionsWithoutPermissions} missing`,
      icon: ShieldCheck,
    },
    {
      label: "Templates",
      value: summary.templateBackedSections,
      detail: `${summary.inactiveCustomSections} inactive`,
      icon: ToggleRight,
    },
  ];

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Sections Readiness</CardTitle>
            <p className="text-sm text-muted-foreground">
              Custom pages, permissions, templates, and enabled modules are checked here.
            </p>
          </div>
          <Button type="button" onClick={onAddSection}>
            Add Section
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-border/70 bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>

        {summary.reviewItems.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Section review needed</AlertTitle>
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
                    <span className="mt-1 block truncate">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-success/40 bg-success-muted p-3 text-sm text-success">
            Active custom sections have pages and permission coverage.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
