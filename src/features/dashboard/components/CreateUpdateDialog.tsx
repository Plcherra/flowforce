import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateUpdateDialogProps {
  children?: React.ReactNode;
}

export default function CreateUpdateDialog({
  children,
}: CreateUpdateDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "announcement" as "announcement" | "news" | "event" | "policy",
    priority: "medium" as "low" | "medium" | "high",
    category: "",
    isPinned: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: t("dashboard.updateCreated"),
        description: t("dashboard.companyUpdateHasBeenPublishedSuccessfully"),
      });

      setOpen(false);
      setFormData({
        title: "",
        content: "",
        type: "announcement",
        priority: "medium",
        category: "",
        isPinned: false,
      });
    } catch (_error) {
      toast({
        title: t("dashboard.error"),
        description: t("dashboard.failedToCreateUpdatePleaseTryAgain"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            {t("dashboard.addUpdate")}</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("dashboard.createCompanyUpdate")}</DialogTitle>
          <DialogDescription>
            {t("dashboard.createAndPublishANewCompanyUpdateToKeepYourTeamInformed")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("dashboard.title")}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={t("dashboard.enterUpdateTitle")}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">{t("dashboard.type")}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, type: value })
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
              <Label htmlFor="priority">{t("dashboard.priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t("dashboard.low")}</SelectItem>
                  <SelectItem value="medium">{t("dashboard.medium")}</SelectItem>
                  <SelectItem value="high">{t("dashboard.high")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("dashboard.category")}</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder={t("dashboard.eGHrOperationsGeneral")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">{t("dashboard.content")}</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder={t("dashboard.writeYourUpdateContentHere")}
              rows={4}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="pinned"
              checked={formData.isPinned}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPinned: checked })
              }
            />
            <Label htmlFor="pinned" className="text-sm font-normal">
              {t("dashboard.pinThisUpdateShowsAtTheTop")}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}</Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("dashboard.publishing") : t("dashboard.publishUpdate")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
