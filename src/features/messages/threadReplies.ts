import type { MessageAttachment, ThreadMessage } from "@/types/messages";

export type ThreadReplySender = (
  content: string,
  parentId?: string,
) => Promise<void> | void;

export interface ThreadReplySource {
  id: string;
  replyToId: string | null;
  createdAt: number;
}

export interface ThreadMessageSource {
  id: string;
  content: string | null;
  created_at: string | null;
  senderid?: string;
  sender_id?: string | null;
  reply_to_id?: string | null;
  reply_toid?: string | null;
  senderprofile?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function replyParentId(message: {
  reply_to_id?: string | null;
  reply_toid?: string | null;
}): string | null {
  const value = message.reply_toid ?? message.reply_to_id ?? null;
  return value && value.length > 0 ? value : null;
}

export function messageSenderId(message: {
  senderid?: string;
  sender_id?: string | null;
}): string {
  return message.senderid || message.sender_id || "";
}

export function senderDisplayName(
  profile:
    | {
        first_name?: string | null;
        last_name?: string | null;
      }
    | null
    | undefined,
  fallbackName: string,
): string {
  const name = [profile?.first_name, profile?.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name || fallbackName;
}

export function messageToThreadMessage(
  message: ThreadMessageSource,
  fallbackName: string,
): ThreadMessage {
  const createdAt = message.created_at ? new Date(message.created_at) : new Date(0);
  return {
    id: message.id,
    content: message.content ?? "",
    sender: {
      id: messageSenderId(message),
      name: senderDisplayName(message.senderprofile, fallbackName),
      avatar: message.senderprofile?.avatar_url ?? undefined,
    },
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt,
    parentId: replyParentId(message) ?? undefined,
  };
}

/**
 * Replies whose parent chain reaches the thread root, oldest first.
 * A cycle or a missing parent stops the walk and excludes that message.
 */
export function collectThreadReplies<T extends ThreadReplySource>(
  messages: readonly T[],
  rootId: string,
): T[] {
  const byId = new Map(messages.map((message) => [message.id, message]));

  const belongsToThread = (message: T): boolean => {
    const seen = new Set<string>();
    let parentId = message.replyToId;
    while (parentId && !seen.has(parentId)) {
      if (parentId === rootId) return true;
      seen.add(parentId);
      parentId = byId.get(parentId)?.replyToId ?? null;
    }
    return false;
  };

  return messages
    .filter((message) => message.id !== rootId && belongsToThread(message))
    .slice()
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
}

export function threadReplyDraft(
  content: string,
  rootId: string,
  parentId?: string | null,
): { content: string; replyToId: string } | null {
  const trimmed = content.trim();
  if (!trimmed || !rootId) return null;
  const replyToId = parentId && parentId.length > 0 ? parentId : rootId;
  return { content: trimmed, replyToId };
}

export function normalizeMessageAttachments(value: unknown): MessageAttachment[] {
  if (!Array.isArray(value)) return [];
  const attachments: MessageAttachment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;
    attachments.push({
      id: typeof record.id === "string" && record.id ? record.id : name,
      name,
      size: typeof record.size === "number" && Number.isFinite(record.size) ? record.size : 0,
      type: typeof record.type === "string" ? record.type : "",
      path: typeof record.path === "string" ? record.path : undefined,
      url: typeof record.url === "string" ? record.url : undefined,
    });
  }
  return attachments;
}
