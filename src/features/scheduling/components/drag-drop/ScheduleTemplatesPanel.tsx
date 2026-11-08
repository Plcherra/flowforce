import { useTranslation } from "react-i18next";
import { Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { shiftChipPaint } from "@/features/scheduling/utils/shiftChipPaint";
import { useShiftTemplates } from "@/features/scheduling/hooks/useShiftTemplates";
import type { ShiftTemplate as SavedShiftTemplate } from "@/features/scheduling/hooks/useShiftTemplates";
import type { ShiftTemplate } from "./types";

interface ScheduleTemplatesPanelProps {
  templates: ShiftTemplate[];
  onTemplateDragStart: (
    event: React.DragEvent,
    template: ShiftTemplate,
  ) => void;
  onTemplateClick?: (template: ShiftTemplate) => void;
}

function clock(hours: number | null) {
  const span = hours && hours > 0 ? hours : 8;
  const start = 9 * 60;
  const end = start + Math.round(span * 60);
  const format = (minutes: number) => {
    const wrapped = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
    const hour = Math.floor(wrapped / 60);
    const minute = wrapped % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };
  return { startTime: format(start), endTime: format(end) };
}

function savedTemplateCard(
  template: SavedShiftTemplate,
  unnamed: string,
  roleFallback: string,
): ShiftTemplate {
  const times = clock(template.duration_hours);
  const role = template.job_position?.role || template.job_position?.name || roleFallback;
  return {
    id: template.id,
    name: template.name || unnamed,
    role,
    color: template.color || "#3b82f6",
    startTime: times.startTime,
    endTime: times.endTime,
    minStaff: template.required_headcount ?? 1,
    maxStaff: template.required_headcount ?? 1,
    positionId: template.job_position_id ?? undefined,
  };
}

export function ScheduleTemplatesPanel({
  templates,
  onTemplateDragStart,
  onTemplateClick,
}: ScheduleTemplatesPanelProps) {
  const { t } = useTranslation();
  const { templates: savedTemplates, loading } = useShiftTemplates();
  const injected = templates.some((template) => template.id.includes("-"));
  const rows = injected
    ? templates
    : savedTemplates.map((template) =>
        savedTemplateCard(
          template,
          t("schedule.untitledShift"),
          t("schedule.unassignedPosition"),
        ),
      );
  return (
    <Card className="lg:w-80 flex-shrink-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t("schedule.roleTemplates")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("schedule.loading")}</p>
        ) : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="role-templates-empty">
            {t("schedule.noSavedShiftTemplates")}
          </p>
        ) : null}
        {rows.map((template) => {
          const paint = shiftChipPaint(template.color, "unassigned");
          return (
            <div
              key={template.id}
              data-testid={`role-template-${template.id}`}
              draggable
              onDragStart={(event) => onTemplateDragStart(event, template)}
              onClick={() => onTemplateClick?.(template)}
              className="rounded-lg cursor-grab border border-black/10 p-3 shadow-sm active:cursor-grabbing"
              style={{
                backgroundColor: paint.backgroundColor,
                color: paint.color,
                borderLeft: paint.borderLeft,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{template.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {template.role}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs opacity-80">
                <Clock className="h-3 w-3" />
                {template.startTime} - {template.endTime}
                <Users className="ml-2 h-3 w-3" />
                {template.minStaff}-{template.maxStaff}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
