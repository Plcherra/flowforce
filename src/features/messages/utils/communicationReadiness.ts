import type { Message, MessageChannel } from "@/types/messages";

export interface CommunicationReadinessSummary {
  totalChannels: number;
  teamChannels: number;
  directChannels: number;
  helpdeskChannels: number;
  privateChannels: number;
  unreadChannels: number;
  emptyChannels: number;
  currentChannelMessages: number;
  currentChannelAttachments: number;
  currentChannelReactions: number;
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
}

function isUnread(channel: MessageChannel, userId?: string | null) {
  if (!userId) return false;
  const member = channel.channel_members?.find(
    (item) => item.user_id === userId,
  );
  if (!member?.last_read_at) return true;
  return new Date(channel.updated_at) > new Date(member.last_read_at);
}

function channelType(channel: MessageChannel) {
  return (channel.type ?? "").toLowerCase();
}

function channelName(channel: MessageChannel) {
  return channel.name?.trim() || "Untitled channel";
}

export function buildCommunicationReadinessSummary({
  channels,
  currentMessages,
  userId,
}: {
  channels: MessageChannel[];
  currentMessages: Message[];
  userId?: string | null;
}): CommunicationReadinessSummary {
  const unreadChannels = channels.filter((channel) =>
    isUnread(channel, userId),
  );
  const teamChannels = channels.filter(
    (channel) => channelType(channel) !== "direct",
  );
  const directChannels = channels.filter(
    (channel) => channelType(channel) === "direct",
  );
  const helpdeskChannels = channels.filter(
    (channel) =>
      channelType(channel) === "helpdesk" ||
      channelName(channel).toLowerCase().includes("help"),
  );
  const privateChannels = channels.filter((channel) => channel.is_private);
  const emptyChannels = channels.filter(
    (channel) => !channel.updated_at || channel.updated_at === channel.created_at,
  );
  const attachmentMessages = currentMessages.filter(
    (message) => (message.attachments ?? []).length > 0,
  );
  const reactionMessages = currentMessages.filter(
    (message) => (message.reactions ?? []).length > 0,
  );

  const reviewItems = [
    ...unreadChannels.slice(0, 4).map((channel) => ({
      id: `unread-${channel.id}`,
      label: "Unread channel",
      detail: channelName(channel),
      severity: "warning" as const,
    })),
    ...emptyChannels.slice(0, 3).map((channel) => ({
      id: `empty-${channel.id}`,
      label: "Channel has no activity",
      detail: channelName(channel),
      severity: "info" as const,
    })),
    ...(channels.length === 0
      ? [
          {
            id: "no-channels",
            label: "No channels",
            detail: "Create a team or direct channel to start communication.",
            severity: "critical" as const,
          },
        ]
      : []),
  ];

  return {
    totalChannels: channels.length,
    teamChannels: teamChannels.length,
    directChannels: directChannels.length,
    helpdeskChannels: helpdeskChannels.length,
    privateChannels: privateChannels.length,
    unreadChannels: unreadChannels.length,
    emptyChannels: emptyChannels.length,
    currentChannelMessages: currentMessages.length,
    currentChannelAttachments: attachmentMessages.length,
    currentChannelReactions: reactionMessages.length,
    reviewItems,
  };
}
