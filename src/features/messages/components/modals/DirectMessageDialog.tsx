import React, { useState } from "react";
import { UserSelector } from "@/components/messages/UserSelector";
import { useMessageChannels } from "@/hooks/messages/useMessageChannels";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface DirectMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onChannelCreated?: (channelId: string) => void;
}

export function DirectMessageDialog({
  open,
  onClose,
  onChannelCreated,
}: DirectMessageDialogProps) {
  const { createChannel } = useMessageChannels();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUserSelect = async (user: User) => {
    setLoading(true);
    try {
      const channelName = `${user.first_name} ${user.last_name}`;

      const { data, error } = await createChannel({
        name: channelName,
        description: `Direct message with ${user.first_name} ${user.last_name}`,
        type: "direct",
        is_private: true,
        member_ids: [user.id],
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Started conversation with ${user.first_name} ${user.last_name}`,
      });

      if (data && onChannelCreated) {
        onChannelCreated(data.id);
      }

      onClose();
    } catch (error) {
      logger.error("Error creating DM channel:", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserSelector
      open={open}
      onClose={onClose}
      onUserSelect={handleUserSelect}
    />
  );
}
