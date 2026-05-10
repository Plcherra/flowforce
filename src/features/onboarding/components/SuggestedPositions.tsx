import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";

interface OnboardingRole {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<string, boolean>;
  is_system_role: boolean;
}

interface SuggestedPositionsProps {
  role: OnboardingRole;
  selectedTemplate: BusinessTemplate | null;
  existingPositions: OnboardingPosition[];
  onAddPosition: (positionName: string) => void;
}

export default function SuggestedPositions({
  role,
  selectedTemplate,
  existingPositions,
  onAddPosition,
}: SuggestedPositionsProps) {
  const suggestedPositions =
    selectedTemplate?.suggestedPositions?.[role.id.replace("custom-", "")] ||
    [];

  if (suggestedPositions.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="font-medium text-sm text-gray-700 mb-3">
        Suggested Positions for {selectedTemplate?.name}
      </h4>
      <div className="flex flex-wrap gap-2 mb-4">
        {suggestedPositions.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => onAddPosition(suggestion)}
            disabled={existingPositions.some((p) => p.name === suggestion)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
