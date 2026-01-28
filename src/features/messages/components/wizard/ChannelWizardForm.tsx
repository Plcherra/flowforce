import React from "react";
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
import type { ChannelData } from "./useChannelWizard";
import { CHANNEL_TYPE_OPTIONS } from "./ChannelWizardSteps";

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
          <h3 className="text-lg font-semibold text-foreground">
            Channel Settings
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Fine tune privacy and membership controls
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Private Channel</p>
              <p className="text-sm text-muted-foreground">
                Only invited members can join this channel
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
            <h4 className="font-medium text-foreground">Channel Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Name:</span>
                <span className="text-foreground font-medium">
                  {channelData.name || "Not set"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Type:</span>
                <span className="text-foreground capitalize">
                  {channelData.type}
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
        <h3 className="text-lg font-semibold text-foreground">
          Channel Details
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Give your channel a name and description
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Channel Name *</Label>
          <Input
            id="name"
            value={channelData.name}
            onChange={(event) =>
              onChannelDataChange({ name: event.target.value })
            }
            placeholder="e.g. general, project-updates"
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
            placeholder="What's this channel about?"
            rows={3}
            className="text-base resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Channel Type</Label>
          <Select
            value={channelData.type}
            onValueChange={(value) => onChannelDataChange({ type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
