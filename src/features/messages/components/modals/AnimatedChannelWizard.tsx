import React from "react";
import { ChannelWizard } from "../wizard/ChannelWizard";

interface AnimatedChannelWizardProps {
  open: boolean;
  onClose: () => void;
  onChannelCreated?: (channelId: string) => void;
}

/**
 * AnimatedChannelWizard - Legacy wrapper for ChannelWizard
 * @deprecated Use ChannelWizard directly from wizard/ folder
 */
export function AnimatedChannelWizard({
  open,
  onClose,
  onChannelCreated,
}: AnimatedChannelWizardProps) {
  return (
    <ChannelWizard
      open={open}
      onClose={onClose}
      onChannelCreated={onChannelCreated}
    />
  );
}
