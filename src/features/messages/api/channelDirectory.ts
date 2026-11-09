import { z } from "zod";

import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import type { MessageChannel } from "@/types/messages";
import {
  channelIsVisible,
  withParticipantNames,
  type DirectoryChannel,
  type ParticipantProfile,
} from "@/features/messages/channelScope";

const MemberSchema = z
  .object({
    user_id: z.string(),
    role: z.string().nullable().optional(),
    last_read_at: z.string().nullable().optional(),
  })
  .passthrough();

const ChannelSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    is_private: z.boolean().nullable().optional(),
    channel_members: z.array(MemberSchema).nullable().optional(),
  })
  .passthrough();

const ProfileSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

async function latestMessageTimes(channelIds: string[]) {
  const latest = new Map<string, string>();
  if (channelIds.length === 0) return latest;

  const { data, error } = await db
    .from("messages")
    .select("channel_id, created_at")
    .in("channel_id", channelIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  for (const row of data ?? []) {
    if (row.channel_id && row.created_at && !latest.has(row.channel_id)) {
      latest.set(row.channel_id, row.created_at);
    }
  }
  return latest;
}

async function participantProfiles(userIds: string[]) {
  if (userIds.length === 0) return [] as ParticipantProfile[];
  const { data, error } = await db
    .from("profiles")
    .select("id, first_name, last_name, avatar_url")
    .in("id", userIds);
  if (error) throw error;
  return ProfileSchema.array().parse(data ?? []);
}

export async function listVisibleChannels(
  userId: string,
  companyId?: string | null,
): Promise<MessageChannel[]> {
  let query = db
    .from("message_channels")
    .select(
      `
      id,
      company_id,
      name,
      description,
      type,
      created_by,
      created_at,
      updated_at,
      is_private,
      department_id,
      channel_members(user_id, role, last_read_at)
    `,
    )
    .order("updated_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const parsed = ChannelSchema.array().parse(data ?? []) as DirectoryChannel[];
  const visible = parsed.filter((channel) =>
    channelIsVisible(channel, userId, companyId),
  );
  const memberIds = [
    ...new Set(
      visible.flatMap((channel) =>
        (channel.channel_members ?? []).map((member) => member.user_id),
      ),
    ),
  ];
  const profiles = await participantProfiles(memberIds);
  const named = withParticipantNames(visible, profiles);
  const latest = await latestMessageTimes(named.map((channel) => channel.id));

  return named.map((channel) => ({
    ...channel,
    name: channel.name ?? "",
    type: channel.type ?? "team",
    latest_message_at: latest.get(channel.id) ?? null,
    channel_members: (channel.channel_members ?? []).map((member) => ({
      user_id: member.user_id,
      role: member.role || "member",
      last_read_at: member.last_read_at ?? null,
      first_name: member.first_name ?? null,
      last_name: member.last_name ?? null,
      avatar_url: member.avatar_url ?? null,
    })),
  })) as MessageChannel[];
}
