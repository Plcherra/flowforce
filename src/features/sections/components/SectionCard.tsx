import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  EyeOff,
  Settings,
  Edit2,
  Trash2,
  MoreHorizontal,
  Copy,
} from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { EditSectionDialog } from "./EditSectionDialog";
import { useState } from "react";

interface SectionCardProps {
  section: any;
  isEnabled: boolean;
  canToggle: boolean;
  isOnboarding: boolean;
  onToggle: (enabled: boolean) => void;
  getSectionBadgeColor: (category: string) => string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function SectionCard({
  section,
  isEnabled,
  canToggle,
  isOnboarding,
  onToggle,
  getSectionBadgeColor,
  onEdit,
  onDelete,
}: SectionCardProps) {
  const { can } = useCan();
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <Card
      className={`transition-all ${isEnabled ? "bg-green-50 border-green-200" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div
              className={`p-2 rounded-lg ${isEnabled ? "bg-green-100" : "bg-gray-100"}`}
            >
              {isEnabled ? (
                <Eye className="h-4 w-4 text-green-600" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{section.name}</CardTitle>
                {section.isCustom && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                  >
                    Custom
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-1">
                <Badge
                  className={`text-xs ${getSectionBadgeColor(section.category)}`}
                >
                  {section.category}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(section.isCustom || can("systemSettings")) && !isOnboarding && (
              <div className="flex items-center space-x-1">
                {section.isCustom && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setShowEditDialog(true)}
                    title="Edit Section"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {section.isCustom && (
                      <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Section
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => {
                        /* TODO: Implement duplicate */
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate Section
                    </DropdownMenuItem>
                    {onDelete && section.isCustom && (
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Section
                      </DropdownMenuItem>
                    )}
                    {!section.isCustom && can("systemSettings") && (
                      <DropdownMenuItem
                        onClick={() => {
                          /* TODO: Implement settings */
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Section Settings
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            <Switch
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={!canToggle}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm mb-3">
          {section.description}
        </CardDescription>

        <div className="text-xs text-muted-foreground">
          <span>Path: {section.path}</span>
        </div>
      </CardContent>

      <EditSectionDialog
        section={"templateId" in section ? null : section}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </Card>
  );
}
