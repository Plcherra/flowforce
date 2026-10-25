import { ScheduleTemplatesPanel } from "./ScheduleTemplatesPanel";
import type { ShiftTemplate } from "./types";

interface AssignmentPanelProps {
  showTemplates: boolean;
  templates: ShiftTemplate[];
  onTemplateDragStart: (
    event: React.DragEvent,
    template: ShiftTemplate,
  ) => void;
  onTemplateClick?: (template: ShiftTemplate) => void;
}

export function AssignmentPanel({
  showTemplates,
  templates,
  onTemplateDragStart,
  onTemplateClick,
}: AssignmentPanelProps) {
  if (!showTemplates) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 lg:w-80 flex-shrink-0">
      <ScheduleTemplatesPanel
        templates={templates}
        onTemplateDragStart={onTemplateDragStart}
        onTemplateClick={onTemplateClick}
      />
    </div>
  );
}
