import React, { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Hash, Users, Lock, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useChannelActions } from "@/features/messages/hooks/useChannelActions";
import { logger } from "@/utils/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  is_private: boolean;
  created_by: string;
}

interface ChannelSettingsProps {
  open: boolean;
  onClose: () => void;
  channel: Channel | null;
  onChannelUpdated?: () => Promise<void> | void;
  onDeleteChannel?: (channelId: string) => Promise<void>;
}

export function ChannelSettings({
  open,
  onClose,
  channel,
  onChannelUpdated,
  onDeleteChannel,
}: ChannelSettingsProps) {
  const { toast } = useToast();
  const { updateChannel: updateChannelSettings } = useChannelActions();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "group",
    is_private: false,
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name,
        description: channel.description || "",
        type: channel.type,
        is_private: channel.is_private,
      });
    }
  }, [channel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel) return;

    setLoading(true);
    try {
      await updateChannelSettings(channel.id, {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        is_private: formData.is_private,
      });

      toast({
        title: "Success",
        description: "Channel settings updated successfully",
      });

      await onChannelUpdated?.();
      onClose();
    } catch (error) {
      logger.error("Error updating channel:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to update channel settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteChannel = async () => {
    if (!channel || !onDeleteChannel) return;

    setLoading(true);
    try {
      await onDeleteChannel(channel.id);
      await onChannelUpdated?.();
      onClose();
    } catch (error) {
      logger.error("Error deleting channel:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Channel Settings
          </DialogTitle>
          <DialogDescription>
            Manage settings for #{channel.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g. general, project-updates"
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="What's this channel about?"
              rows={3}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Channel Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Group Channel
                  </div>
                </SelectItem>
                <SelectItem value="department">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Department Channel
                  </div>
                </SelectItem>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Direct Message
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="private" className="flex items-center gap-2">
                {formData.is_private ? (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                Private Channel
              </Label>
              <p className="text-xs text-muted-foreground">
                {formData.is_private
                  ? "Only invited members can see this channel"
                  : "Everyone in the workspace can see this channel"}
              </p>
            </div>
            <Switch
              id="private"
              checked={formData.is_private}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_private: checked })
              }
            />
          </div>

          <div className="flex justify-between space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading || !onDeleteChannel}
              size="sm"
            >
              Delete Channel
            </Button>

            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.name.trim()}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete channel</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete #{channel?.name}. All messages in
              this channel will be removed and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
              onClick={handleDeleteChannel}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
