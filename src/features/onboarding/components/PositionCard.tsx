import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { OnboardingPosition } from "@/types/templates";

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

interface PositionCardProps {
  position: OnboardingPosition;
  role: OnboardingRole;
  onEdit: (position: OnboardingPosition) => void;
  onDelete: (positionId: string) => void;
}

export default function PositionCard({
  position,
  role,
  onEdit,
  onDelete,
}: PositionCardProps) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: role.color }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h5 className="font-medium text-gray-900">{position.name}</h5>
              <Badge variant="outline" className="text-xs">
                {role.name}
              </Badge>
            </div>
            {position.description && (
              <p className="text-sm text-gray-600">{position.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(position)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(position.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
