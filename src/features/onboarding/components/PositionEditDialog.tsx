import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingPosition } from "@/types/templates";

interface PositionEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: OnboardingPosition | null;
  onSave: (data: Partial<OnboardingPosition>) => void;
}

export default function PositionEditDialog({
  open,
  onOpenChange,
  position,
  onSave,
}: PositionEditDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (position) {
      setFormData({
        name: position.name,
        description: position.description,
      });
    } else {
      setFormData({
        name: "",
        description: "",
      });
    }
  }, [position]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {position ? "Edit Position" : "Create New Position"}
          </DialogTitle>
          <DialogDescription>{t("onboarding.configureThePositionDetails")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("onboarding.positionName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("onboarding.enterPositionName")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("tasks.description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder={t("onboarding.describeThisPositionSResponsibilities")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("onboarding.wizard.cancel")}
            </Button>
            <Button type="submit">
              {position ? "Update Position" : "Create Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
