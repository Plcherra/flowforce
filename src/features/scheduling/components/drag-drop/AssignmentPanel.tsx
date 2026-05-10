import { ScheduleTemplatesPanel } from "./ScheduleTemplatesPanel";
import { AISidebar } from "./AISidebar";
import type {
  ShiftTemplate,
  VendorPaletteItem,
  AIRecommendation,
} from "./types";

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
  onAutoFillWeek: () => void;
  onQuickVendorVisit: () => Promise<void>;
  showAIRecommendations: boolean;
  aiRecommendations: AIRecommendation[];
  onAssignFromAI: (recommendation: AIRecommendation) => void;
}

export function AssignmentPanel({
  showTemplates,
  templates,
  vendors,
  onTemplateDragStart,
  onVendorDragStart,
  onAutoFillWeek,
  onQuickVendorVisit,
  showAIRecommendations,
  aiRecommendations,
  onAssignFromAI,
}: AssignmentPanelProps) {
  if (!showTemplates && !showAIRecommendations) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 lg:w-80 flex-shrink-0">
      {showTemplates && (
        <ScheduleTemplatesPanel
          templates={templates}
          vendors={vendors}
          onTemplateDragStart={onTemplateDragStart}
          onVendorDragStart={onVendorDragStart}
          onAutoFillWeek={onAutoFillWeek}
          onQuickVendorVisit={onQuickVendorVisit}
        />
      )}

      {showAIRecommendations && (
        <AISidebar
          recommendations={aiRecommendations}
          onAssign={onAssignFromAI}
        />
      )}
    </div>
  );
}
