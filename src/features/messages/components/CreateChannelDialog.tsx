import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useMessageChannels } from "@/features/messages/hooks/useMessageChannels";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface CreateChannelDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateChannelDialog({
  open,
  onClose,
}: CreateChannelDialogProps) {
  const { t } = useTranslation();
  const { createChannel } = useMessageChannels();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "group",
    is_private: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await createChannel({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        is_private: formData.is_private,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Channel created successfully",
      });

      setFormData({
        name: "",
        description: "",
        type: "group",
        is_private: false,
      });
      onClose();
    } catch (error) {
      logger.error("Error creating channel:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("messages.createChannel")}</DialogTitle>
          <DialogDescription>
            {t("messages.createANewChannelForTeamCommunication")} </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("messages.channelName")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t("messages.eGGeneralProjectUpdates")}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("tasks.description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("messages.whatSThisChannelAbout")}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">{t("messages.channelType")}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">{t("messages.groupChannel")}</SelectItem>
                <SelectItem value="department">{t("messages.departmentChannel")}</SelectItem>
                <SelectItem value="direct">{t("messages.directMessage")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="private"
              checked={formData.is_private}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_private: checked })
              }
            />
            <Label htmlFor="private">{t("messages.privateChannel")}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("common.cancel")} </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
