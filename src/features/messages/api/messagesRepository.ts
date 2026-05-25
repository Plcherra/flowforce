import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  CreateChannelData,
  Message,
  MessageAttachment,
  MessageChannel,
  SearchResult,
} from "@/types/messages";
import { logger } from "@/utils/logger";

const ProfileSchema = z.object({
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

const ChannelMemberSchema = z.object({
  user_id: z.string(),
  role: z.string().default("member"),
  last_read_at: z.string().nullable().optional(),
});

const DepartmentSchema = z.object({
  name: z.string().nullable().optional(),
});

const MessageChannelSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable().optional(),
    name: z.string(),
    description: z.string().nullable().optional(),
    type: z.string(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    department_id: z.string().nullable().optional(),
    is_private: z.boolean().nullable().optional(),
    channel_members: z.array(ChannelMemberSchema).default([]),
    created_profile: ProfileSchema.omit({ avatar_url: true }).optional(),
    department: DepartmentSchema.nullable().optional(),
  })
  .passthrough();

const AttachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  path: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
});

const ReplySenderSchema = ProfileSchema.omit({ avatar_url: true });

const RawMessageSchema = z
  .object({
    id: z.string(),
    channel_id: z.string(),
    sender_id: z.string(),
    content: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    reply_to_id: z.string().nullable().optional(),
    message_type: z.string().nullable().optional(),
    attachments: z.array(AttachmentSchema).nullable().optional(),
    sender_profile: ProfileSchema,
    reply_to_message: z
      .union([
        z
          .array(
            z.object({
              content: z.string().nullable().optional(),
              sender_profile: ReplySenderSchema.optional(),
            }),
          )
          .nullable(),
        z.object({
          content: z.string().nullable().optional(),
          sender_profile: ReplySenderSchema.optional(),
        }),
        z.null(),
        z.undefined(),
      ])
      .optional(),
  })
  .passthrough();

const SearchResultSchema = z
  .object({
    id: z.string(),
    content: z.string(),
    created_at: z.string(),
    sender_profile: ProfileSchema,
    channel: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string().nullable().optional(),
      is_private: z.boolean().nullable().optional(),
    }),
  })
  .passthrough();

const ChannelMemberDetailSchema = z
  .object({
    id: z.string().optional(),
    channel_id: z.string(),
    user_id: z.string(),
    role: z.string().nullable().optional(),
    joined_at: z.string().optional(),
    last_read_at: z.string().nullable().optional(),
    user_profile: z
      .object({
        first_name: z.string().nullable().optional(),
        last_name: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        avatar_url: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type ChannelMemberDetail = z.infer<typeof ChannelMemberDetailSchema>;

async function ensureChannelMembership(channelId: string, userId: string) {
  const { data, error } = await supabase
    .from("channel_members")
    .select("channel_id")
    .eq("channel_id", channelId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("Forbidden: user is not a member of this channel");
  }
}

async function listChannels(
  userId: string,
  companyId?: string | null,
): Promise<MessageChannel[]> {
  let query = supabase
    .from("message_channels")
    .select(
      `
      *,
      created_profile:profiles!created_by(first_name, last_name, company_id),
      department:departments(name),
      channel_members!inner(user_id, role, last_read_at)
    `,
    )
    .eq("channel_members.user_id", userId);

  // Filter by creator's company_id if provided for additional security
  // Note: message_channels table doesn't have company_id column, so we filter via creator's profile
  if (companyId) {
    query = query.eq("created_profile.company_id", companyId);
  }

  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  const parsed = MessageChannelSchema.array().parse(data ?? []);

  // Additional client-side filtering as safety net
  if (companyId) {
    const filtered = parsed.filter((channel) => {
      // Type-safe access to created_profile company_id
      const createdProfile = channel.created_profile as
        | { company_id?: string }
        | undefined;
      const creatorCompanyId = createdProfile?.company_id;
      return creatorCompanyId === companyId;
    });
    return filtered as MessageChannel[];
  }

  return parsed as MessageChannel[];
}

async function createChannel(
  channelData: CreateChannelData,
  creatorId: string,
  companyId?: string | null,
): Promise<MessageChannel> {
  const { data, error } = await supabase
    .from("message_channels")
    .insert({
      company_id: channelData.company_id ?? companyId ?? null,
      name: channelData.name,
      description: channelData.description ?? null,
      type: channelData.type ?? "team",
      department_id: channelData.department_id ?? null,
      created_by: creatorId,
      is_private: channelData.is_private ?? false,
    })
    .select(
      `
      *,
      channel_members(user_id, role, last_read_at)
    `,
    )
    .single();

  if (error) throw error;
  return MessageChannelSchema.parse(data) as MessageChannel;
}

async function addChannelMembers(
  channelId: string,
  members: { user_id: string; role?: string | null }[],
) {
  if (members.length === 0) return;

  // Insert members one by one to get better error messages if RLS fails
  // This also helps identify which specific member insertion fails
  const results = [];
  for (const member of members) {
    const insert = {
      channel_id: channelId,
      user_id: member.user_id,
      role: member.role ?? "member",
    };

    const { error, data } = await supabase
      .from("channel_members")
      .insert(insert)
      .select()
      .single();

    if (error) {
      // Create a proper Error object with Supabase error details
      const errorMessage =
        error.message || `Failed to add member ${member.user_id} to channel`;
      const channelError = new Error(errorMessage);
      (
        channelError as Error & {
          code?: string;
          details?: string;
          hint?: string;
        }
      ).code = error.code;
      (
        channelError as Error & {
          code?: string;
          details?: string;
          hint?: string;
        }
      ).details = error.details;
      (
        channelError as Error & {
          code?: string;
          details?: string;
          hint?: string;
        }
      ).hint = error.hint;

      logger.error("Failed to add channel member", {
        error: channelError,
        context: {
          channelId,
          userId: member.user_id,
          role: member.role,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          allMembers: members.map((m) => ({
            user_id: m.user_id,
            role: m.role,
          })),
        },
        tags: ["error", "channels"],
      });
      throw channelError;
    }

    if (data) results.push(data);
  }

  return results;
}

async function updateLastRead(channelId: string, userId: string) {
  const { error } = await supabase
    .from("channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channelId)
    .eq("user_id", userId);

  if (error) throw error;
}

async function listMessages(
  channelId: string,
  userId: string,
  options?: { limit?: number; after?: string },
): Promise<Message[]> {
  await ensureChannelMembership(channelId, userId);

  let query = supabase
    .from("messages")
    .select(
      `
      *,
      sender_profile:profiles!sender_id(first_name, last_name, avatar_url),
      reply_to_message:messages!reply_to_id(
        content,
        sender_profile:profiles!sender_id(first_name, last_name)
      )
    `,
    )
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });

  // Pagination support (Phase 4 optimization)
  if (options?.after) {
    query = query.gt("created_at", options.after);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  const parsed = RawMessageSchema.array().parse(data ?? []);
  const normalized = parsed.map((message) => ({
    ...message,
    attachments: message.attachments ?? [],
    reply_to_message: Array.isArray(message.reply_to_message)
      ? (message.reply_to_message[0] ?? null)
      : (message.reply_to_message ?? null),
  }));

  return normalized as Message[];
}

// Phase 5: Zod schemas for message input validation
const MessageContentSchema = z
  .string()
  .min(1, "Message content cannot be empty")
  .max(10000, "Message content must be less than 10000 characters");

const MessageAttachmentInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  path: z.string().min(1).max(1024).nullable().optional(),
  url: z.string().url().nullable().optional(),
  type: z.string().max(100).nullable().optional(),
  size: z.number().int().positive().nullable().optional(),
});

const InsertMessageOptionsSchema = z.object({
  replyToId: z.string().uuid().optional(),
  attachments: z
    .array(MessageAttachmentInputSchema)
    .max(10, "Maximum 10 attachments allowed")
    .optional(),
});

async function insertMessage(
  channelId: string,
  senderId: string,
  content: string,
  options: { replyToId?: string; attachments?: MessageAttachment[] } = {},
): Promise<Message> {
  // Phase 5: Validate inputs with Zod schemas
  const contentValidation = MessageContentSchema.safeParse(content);
  if (!contentValidation.success) {
    const error =
      contentValidation.error.errors[0]?.message ?? "Invalid message content";
    logger.error("[messagesRepository] Invalid message content", {
      errors: contentValidation.error.errors,
      tags: ["validation", "error"],
    });
    throw new Error(error);
  }

  const optionsValidation = InsertMessageOptionsSchema.safeParse(options);
  if (!optionsValidation.success) {
    const errors = optionsValidation.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    logger.error("[messagesRepository] Invalid message options", {
      errors: optionsValidation.error.errors,
      tags: ["validation", "error"],
    });
    throw new Error(`Invalid message options: ${errors}`);
  }

  // Validate channelId and senderId format
  if (!z.string().uuid().safeParse(channelId).success) {
    throw new Error("Invalid channelId format");
  }
  if (!z.string().uuid().safeParse(senderId).success) {
    throw new Error("Invalid senderId format");
  }

  await ensureChannelMembership(channelId, senderId);

  const attachmentsPayload = (options.attachments ?? []).map((attachment) => ({
    id:
      attachment.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : undefined),
    name: attachment.name,
    path: attachment.path ?? null,
    url: attachment.url ?? null,
    type: attachment.type,
    size: attachment.size ?? null,
  }));

  const messageType =
    attachmentsPayload.length === 0
      ? "text"
      : attachmentsPayload.every((attachment) =>
            attachment.type?.startsWith("image/"),
          )
        ? "image"
        : "file";

  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_id: channelId,
      sender_id: senderId,
      content,
      reply_to_id: options.replyToId ?? null,
      attachments: attachmentsPayload,
      message_type: messageType,
    })
    .select(
      `
      *,
      sender_profile:profiles!sender_id(first_name, last_name, avatar_url),
      reply_to_message:messages!reply_to_id(
        content,
        sender_profile:profiles!sender_id(first_name, last_name)
      )
    `,
    )
    .single();

  if (error) throw error;
  const parsed = RawMessageSchema.parse(data);
  const normalized = {
    ...parsed,
    attachments: parsed.attachments ?? [],
    reply_to_message: Array.isArray(parsed.reply_to_message)
      ? (parsed.reply_to_message[0] ?? null)
      : (parsed.reply_to_message ?? null),
  };

  return normalized as Message;
}

async function updateMessage(
  messageId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .update({
      content,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("sender_id", senderId)
    .select(
      `
      *,
      sender_profile:profiles!sender_id(first_name, last_name, avatar_url),
      reply_to_message:messages!reply_to_id(
        content,
        sender_profile:profiles!sender_id(first_name, last_name)
      )
    `,
    )
    .single();

  if (error) throw error;
  const parsed = RawMessageSchema.parse(data);
  const normalized = {
    ...parsed,
    attachments: parsed.attachments ?? [],
    reply_to_message: Array.isArray(parsed.reply_to_message)
      ? (parsed.reply_to_message[0] ?? null)
      : (parsed.reply_to_message ?? null),
  };

  return normalized as Message;
}

async function deleteMessage(messageId: string, senderId: string) {
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", senderId);

  if (error) throw error;
}

async function searchMessages(
  query: string,
  userId: string,
  channelId?: string,
): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];

  let builder = supabase
    .from("messages")
    .select(
      `
      id,
      content,
      created_at,
      sender_profile:profiles!messages_sender_id_fkey(
        first_name,
        last_name,
        avatar_url
      ),
      channel:message_channels!inner(
        id,
        name,
        type,
        is_private,
        channel_members!inner(user_id)
      )
    `,
    )
    .textSearch("content", query)
    .eq("channel.channel_members.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (channelId) {
    builder = builder.eq("channel_id", channelId);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return SearchResultSchema.array().parse(data ?? []) as SearchResult[];
}

async function listChannelMembers(
  channelId: string,
  requestorId: string,
): Promise<ChannelMemberDetail[]> {
  await ensureChannelMembership(channelId, requestorId);
  const { data, error } = await supabase
    .from("channel_members")
    .select(
      `
      id,
      channel_id,
      user_id,
      role,
      joined_at,
      last_read_at,
      user_profile:profiles!channel_members_user_id_fkey(
        first_name,
        last_name,
        email,
        avatar_url
      )
    `,
    )
    .eq("channel_id", channelId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return ChannelMemberDetailSchema.array().parse(data ?? []);
}

async function updateMemberRole(memberId: string, newRole: string) {
  const { error } = await supabase
    .from("channel_members")
    .update({ role: newRole })
    .eq("id", memberId);
  if (error) throw error;
}

async function removeMember(memberId: string) {
  const { error } = await supabase
    .from("channel_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

async function deleteChannel(
  channelId: string,
  userId: string,
  companyId?: string | null,
) {
  await ensureChannelMembership(channelId, userId);

  // Verify company_id for tenant isolation if provided
  if (companyId) {
    const { data: channelData, error: channelError } = await supabase
      .from("message_channels")
      .select("created_by, created_profile:profiles!created_by(company_id)")
      .eq("id", channelId)
      .maybeSingle();

    if (channelError) throw channelError;
    if (!channelData) {
      throw new Error("Channel not found");
    }

    const createdProfile = channelData.created_profile as
      | { company_id?: string }
      | undefined;
    const creatorCompanyId = createdProfile?.company_id;

    if (creatorCompanyId !== companyId) {
      throw new Error("Forbidden: Cannot delete channel from another company");
    }
  }

  const { error: messagesError } = await supabase
    .from("messages")
    .delete()
    .eq("channel_id", channelId);
  if (messagesError) throw messagesError;

  const { error: membersError } = await supabase
    .from("channel_members")
    .delete()
    .eq("channel_id", channelId);
  if (membersError) throw membersError;

  const { error } = await supabase
    .from("message_channels")
    .delete()
    .eq("id", channelId);
  if (error) throw error;
}

export const messagesRepository = {
  listChannels,
  createChannel,
  addChannelMembers,
  updateLastRead,
  listMessages,
  insertMessage,
  updateMessage,
  searchMessages,
  listChannelMembers,
  updateMemberRole,
  removeMember,
  deleteMessage,
  deleteChannel,
};
