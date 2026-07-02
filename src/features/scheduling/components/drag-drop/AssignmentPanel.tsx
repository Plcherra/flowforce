import { ScheduleTemplatesPanel } from "./ScheduleTemplatesPanel";
import type { ShiftTemplate, VendorPaletteItem } from "./types";

interface AssignmentPanelProps {
  showTemplates: boolean;
  templates: ShiftTemplate[];
  vendors: VendorPaletteItem[];
  onTemplateDragStart: (
    event: React.DragEvent,
    template: ShiftTemplate,
  ) => void;
  onVendorDragStart: (
    event: React.DragEvent,
    vendor: VendorPaletteItem,
  ) => void;
  onQuickVendorVisit: () => Promise<void>;
}

export function AssignmentPanel({
  showTemplates,
  templates,
  vendors,
  onTemplateDragStart,
  onVendorDragStart,
  onQuickVendorVisit,
}: AssignmentPanelProps) {
  if (!showTemplates) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 lg:w-80 flex-shrink-0">
      <ScheduleTemplatesPanel
        templates={templates}
        vendors={vendors}
        onTemplateDragStart={onTemplateDragStart}
        onVendorDragStart={onVendorDragStart}
        onQuickVendorVisit={onQuickVendorVisit}
      />
    </div>
  );
}
