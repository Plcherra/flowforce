import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { ChannelData } from "./useChannelWizard";

interface ChannelWizardFormProps {
  channelData: ChannelData;
  onChannelDataChange: (data: Partial<ChannelData>) => void;
  showSettings?: boolean;
}

export function ChannelWizardForm({
  channelData,
  onChannelDataChange,
  showSettings = false,
}: ChannelWizardFormProps) {
  if (showSettings) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">Privacy</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose who can see this group
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Private group</p>
              <p className="text-sm text-muted-foreground">
                Only the people you add can see this group
              </p>
            </div>
            <Switch
              checked={channelData.is_private}
              onCheckedChange={(checked) =>
                onChannelDataChange({ is_private: checked })
              }
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium text-foreground">Group summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground font-medium">
                  {channelData.name || "Not set"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Privacy:</span>
                <span className="text-foreground">
                  {channelData.is_private ? "Private" : "Public"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Members:</span>
                <span className="text-foreground">
                  {channelData.members.length} selected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Group details</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Give the group a name
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Group name *</Label>
          <Input
            id="name"
            value={channelData.name}
            onChange={(event) =>
              onChannelDataChange({ name: event.target.value })
            }
            placeholder="e.g. Closing crew"
            className="text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={channelData.description}
            onChange={(event) =>
              onChannelDataChange({ description: event.target.value })
            }
            placeholder="What is this group for?"
            rows={3}
            className="text-base resize-none"
          />
        </div>

      </div>
    </div>
  );
}
