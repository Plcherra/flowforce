import { useTranslation } from "react-i18next";
import { Calendar, Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DayEventNotice } from "@/features/scheduling/components/DayEventNotice";
import { shiftChipPaint } from "@/features/scheduling/utils/shiftChipPaint";
import type { ShiftTemplate } from "./types";

interface ScheduleTemplatesPanelProps {
  templates: ShiftTemplate[];
  onTemplateDragStart: (
    event: React.DragEvent,
    template: ShiftTemplate,
  ) => void;
  onTemplateClick?: (template: ShiftTemplate) => void;
}

export function ScheduleTemplatesPanel({
  templates,
  onTemplateDragStart,
  onTemplateClick,
}: ScheduleTemplatesPanelProps) {
  const { t } = useTranslation();
  return (
    <Card className="lg:w-80 flex-shrink-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {t("schedule.roleTemplates")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {templates.map((template) => {
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

        <div className="mt-4 space-y-2 border-t pt-4">
          <h3 className="text-sm font-semibold">{t("schedule.vendorVisits")}</h3>
          <DayEventNotice className="text-xs" />
        </div>
      </CardContent>
    </Card>
  );
}
