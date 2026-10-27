import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useCompanyUpdateMutations } from "@/features/company-updates/hooks/useCompanyUpdateMutations";
import { RichTextEditor } from "@/features/company-updates/wizard/RichTextEditor";
import type { CompanyUpdate } from "@/types/companyUpdates";
import { Loader2 } from "lucide-react";
import { logger } from "@/utils/logger";

interface EditUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  update: CompanyUpdate | null;
  onUpdateComplete?: () => void;
}

export function EditUpdateDialog({
  open,
  onOpenChange,
  update,
  onUpdateComplete,
}: EditUpdateDialogProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { updateUpdate } = useCompanyUpdateMutations();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    richContent: "",
    type: "announcement" as CompanyUpdate["type"],
    priority: "medium" as CompanyUpdate["priority"],
  });

  useEffect(() => {
    if (update && open) {
      setFormData({
        title: update.title,
        body: update.body,
        richContent: update.richContent ?? "",
        type: update.type,
        priority: update.priority,
      });
    }
  }, [update, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!update) return;

    if (!formData.title.trim()) {
      toast({
        title: t("dashboard.error"),
        description: t("updates.titleRequired"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updateUpdate(update.id, {
        title: formData.title.trim(),
        body: formData.body.trim(),
        rich_content: formData.richContent || null,
        type: formData.type,
        priority: formData.priority,
      });

      onOpenChange(false);
      onUpdateComplete?.();
    } catch (error) {
      logger.error("Failed to update", { error, tags: ["error"] });
    } finally {
      setLoading(false);
    }
  };

  if (!update) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("updates.editCompanyUpdate")}</DialogTitle>
          <DialogDescription>
            {t("updates.makeChangesToYourCompanyUpdate")} </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("tasks.title")}</Label>
            <Input
              id="title"
              placeholder={t("updates.updateTitle")}
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">{t("updates.body")}</Label>
            <Textarea
              id="body"
              placeholder={t("updates.updateContent")}
              value={formData.body}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, body: e.target.value }))
              }
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="richContent">{t("updates.richContentHtml")}</Label>
            <RichTextEditor
              value={formData.richContent}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, richContent: value }))
              }
              placeholder={t("updates.writeYourUpdateContent")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t("schedule.type")}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: value as CompanyUpdate["type"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">{t("dashboard.announcement")}</SelectItem>
                  <SelectItem value="news">{t("dashboard.news")}</SelectItem>
                  <SelectItem value="event">{t("dashboard.event")}</SelectItem>
                  <SelectItem value="policy">{t("dashboard.policy")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">{t("tasks.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: value as CompanyUpdate["priority"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("tasks.low")}</SelectItem>
                  <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
                  <SelectItem value="high">{t("tasks.high")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")} </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("updates.saveChanges")} </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
