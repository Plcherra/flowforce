import { useTranslation } from "react-i18next";
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
import { Edit2, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { EditSectionDialog } from "./EditSectionDialog";
import { CustomSection } from "@/hooks/useCustomSections";

interface CustomSectionCardProps {
  section: CustomSection;
  isEnabled: boolean;
  canToggle: boolean;
  onToggle: (enabled: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

export default function CustomSectionCard({
  section,
  isEnabled,
  canToggle,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
}: CustomSectionCardProps) {
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEdit = () => {
    setShowEditDialog(true);
    onEdit?.();
  };

  const handleDelete = () => {
    if (
      confirm(
        `Are you sure you want to delete "${section.name}"? This action cannot be undone.`,
      )
    ) {
      onDelete?.();
    }
  };

  return (
    <Card
      className={`transition-all border-l-4 ${
        isEnabled
          ? "bg-success/50 border-success/40 border-l-success"
          : "bg-background/50 border-border border-l-border"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div
              className={`p-2 rounded-lg ${isEnabled ? "bg-success-muted" : "bg-muted"}`}
            >
              {isEnabled ? (
                <Eye className="h-4 w-4 text-success" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {section.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="outline"
                    className="text-xs bg-secondary/10 text-secondary border-secondary/40"
                  >
                    {t("common.custom")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      section.category === "core"
                        ? "bg-primary/10 text-primary border-primary/40"
                        : section.category === "industry"
                          ? "bg-success-muted text-success border-success/40"
                          : section.category === "operations"
                            ? "bg-warning-muted text-warning-foreground border-warning/40"
                            : "bg-background text-muted-foreground border-border"
                    }`}
                  >
                    {section.category}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
            disabled={!canToggle}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <CardDescription className="text-sm">
          {section.description || "No description provided"}
        </CardDescription>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span>{t("sections.path2")} {section.path}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 hover:bg-primary hover:text-primary-foreground"
              onClick={handleEdit}
              title={t("sections.editSection")}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              {t("common.edit")}
            </Button>

            {onDuplicate && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={onDuplicate}
                title={t("sections.duplicateSection")}
              >
                <Copy className="h-4 w-4 mr-1" />
                {t("sections.copy")}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleDelete}
              title={t("sections.deleteSection")}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("common.delete")}
            </Button>
          </div>
        </div>
      </CardContent>

      <EditSectionDialog
        section={section}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </Card>
  );
}
