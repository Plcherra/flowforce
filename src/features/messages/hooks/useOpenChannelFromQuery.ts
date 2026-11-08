import { useEffect } from "react";

export function useOpenChannelFromQuery(
  search: string,
  channels: { id: string }[],
  setCurrentChannelId: (channelId: string) => void,
) {
  useEffect(() => {
    const channelId = new URLSearchParams(search).get("channel");
    if (!channelId) return;
    if (!channels.some((channel) => channel.id === channelId)) return;
    setCurrentChannelId(channelId);
  }, [channels, search, setCurrentChannelId]);
}
