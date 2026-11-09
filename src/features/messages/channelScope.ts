export interface ChannelMemberRecord {
  user_id: string;
  role?: string | null;
  last_read_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export interface DirectoryChannel {
  id: string;
  company_id?: string | null;
  name?: string | null;
  type?: string | null;
  created_by?: string | null;
  latest_message_at?: string | null;
  channel_members?: ChannelMemberRecord[] | null;
}

export interface ParticipantProfile {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
}

export function channelIsVisible(
  channel: DirectoryChannel,
  userId: string,
  companyId?: string | null,
): boolean {
  if (companyId && channel.company_id && channel.company_id !== companyId) {
    return false;
  }
  const members = channel.channel_members ?? [];
  return (
    channel.created_by === userId ||
    members.some((member) => member.user_id === userId)
  );
}

export function withParticipantNames<T extends DirectoryChannel>(
  channels: T[],
  profiles: ParticipantProfile[],
): T[] {
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return channels.map((channel) => ({
    ...channel,
    channel_members: (channel.channel_members ?? []).map((member) => {
      const profile = byId.get(member.user_id);
      return {
        ...member,
        role: member.role || "member",
        last_read_at: member.last_read_at ?? null,
        first_name: profile?.first_name ?? member.first_name ?? null,
        last_name: profile?.last_name ?? member.last_name ?? null,
        avatar_url: profile?.avatar_url ?? member.avatar_url ?? null,
      };
    }),
  }));
}

export function participantLabel(
  member: ChannelMemberRecord | undefined,
  fallback: string,
): string {
  const name = [member?.first_name, member?.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name || fallback;
}

export function directChatTitle(
  channel: DirectoryChannel,
  currentUserId: string | null | undefined,
  fallback: string,
): string {
  const stored = channel.name?.trim() || fallback;
  if ((channel.type ?? "").toLowerCase() !== "direct") return stored;
  const others = (channel.channel_members ?? []).filter(
    (member) => member.user_id !== currentUserId,
  );
  const named = others
    .map((member) => participantLabel(member, ""))
    .find((name) => name.length > 0);
  return named || stored;
}

export function chatIsUnread(
  channel: DirectoryChannel,
  userId: string | null | undefined,
  openChannelId?: string | null,
): boolean {
  if (!userId || channel.id === openChannelId) return false;
  if (!channel.latest_message_at) return false;
  const me = (channel.channel_members ?? []).find(
    (member) => member.user_id === userId,
  );
  if (!me) return false;
  if (!me.last_read_at) return true;
  const latest = new Date(channel.latest_message_at).getTime();
  const read = new Date(me.last_read_at).getTime();
  if (Number.isNaN(latest) || Number.isNaN(read)) return false;
  return latest > read;
}

export function messageRecipientIds(
  members: { user_id: string }[],
  senderId: string,
): string[] {
  return [
    ...new Set(
      members
        .map((member) => member.user_id)
        .filter((userId) => userId && userId !== senderId),
    ),
  ];
}
