import { useTranslation } from "react-i18next";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { MessageAttachments } from "./MessageAttachments";
import { useMessageTranslations } from "@/features/messages/hooks/useMessageTranslations";
import { MessageBody } from "@/features/messages/components/conversations/MessageBody";
import {
  normalizeMessageAttachments,
  senderDisplayName,
} from "@/features/messages/threadReplies";
import { formatChatTime } from "@/features/messages/chatTime";
import type { Message, ThreadMessage } from "@/types/messages";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import {
  safeArrayLength,
  safeArrayMap,
  asArray,
} from "@/utils/reactQueryTypes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MessagesListProps {
  messages: Message[];
  loading: boolean;
  onThreadMessage: (message: ThreadMessage) => void;
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onUpdateMessage?: (messageId: string, content: string) => Promise<void>;
  channelMembers?: Array<{ user_id: string; last_read_at: string | null }>;
}

export function MessagesList({
  messages,
  loading,
  currentUserId,
  onDeleteMessage,
}: MessagesListProps) {
  const { t, i18n } = useTranslation();
  const { can } = useCan();
  const canModerateMessages = can("messages.manage");
  const messageSources = useMemo(
    () =>
      messages.map((message) => ({
        id: message.id,
        content: message.content,
        updated_at: message.updated_at,
      })),
    [messages],
  );
  const translations = useMessageTranslations(messageSources);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messagePendingDelete, setMessagePendingDelete] =
    useState<Message | null>(null);
  const safeMessages = asArray(messages);
  const [deleting, setDeleting] = useState(false);
  const locale = i18n.resolvedLanguage || i18n.language;

  const lastMessageId = safeMessages[safeArrayLength(safeMessages) - 1]?.id;
  useEffect(() => {
    if (!lastMessageId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lastMessageId]);

  if (loading) {
    return (
      <ScrollArea
        className="flex-1 p-4"
        aria-label={t("messages.loadingConversationMessages")}
      >
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`messages-skeleton-${index}`}
              className={cn("flex", index % 2 === 0 ? "justify-start" : "justify-end")}
            >
              <Skeleton className="h-12 w-40 rounded-2xl" />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" data-testid="chat-transcript">
      <div className="space-y-3" role="log" aria-live="polite">
        {safeArrayLength(safeMessages) === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {t("messages.noMessagesYetBeTheFirstToSendOne")}
            </p>
          </div>
        ) : (
          safeArrayMap(safeMessages, (message) => {
            const senderProfile = message.senderprofile ?? {
              first_name: "",
              last_name: "",
              avatar_url: null,
            };
            const displayName = senderDisplayName(
              senderProfile,
              t("messages.teamMember"),
            );
            const initials =
              `${senderProfile.first_name?.charAt(0) ?? ""}${senderProfile.last_name?.charAt(0) ?? ""}`.trim() ||
              displayName.charAt(0).toUpperCase() ||
              "U";
            const mine = message.senderid === currentUserId;
            const timestamp = formatChatTime(message.created_at, locale);
            const attachments = normalizeMessageAttachments(message.attachments);
            const canDelete = mine || canModerateMessages;

            return (
              <div
                key={message.id}
                data-testid="chat-bubble"
                data-own={mine ? "true" : "false"}
                className={cn("flex w-full", mine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "flex max-w-[85%] items-end gap-2 sm:max-w-[75%]",
                    mine ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  {!mine && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={senderProfile.avatar_url || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex min-w-0 flex-col">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 text-sm shadow-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {!mine && (
                      <p className="mb-1 text-xs font-medium">{displayName}</p>
                    )}
                    <MessageBody
                      content={message.content}
                      translation={translations.get(message.id) ?? null}
                      className={cn(
                        "whitespace-pre-wrap break-words text-sm",
                        mine ? "text-primary-foreground" : "text-foreground",
                      )}
                    />
                    {attachments.length > 0 && (
                      <MessageAttachments attachments={attachments} readOnly />
                    )}
                    <div
                      className={cn(
                        "mt-1 flex items-center gap-2 text-[11px]",
                        mine ? "justify-end text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {timestamp && <time dateTime={message.created_at}>{timestamp}</time>}
                      {message.edited_at && <span>{t("messages.edited")}</span>}
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-6 w-6 p-0",
                            mine && "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                          )}
                          data-testid="chat-delete"
                          aria-label={t("messages.deleteMessage")}
                          onClick={() => setMessagePendingDelete(message)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <MessageReactions messageId={message.id} className="mt-1" />
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        <AlertDialog
          open={Boolean(messagePendingDelete)}
          onOpenChange={(open) => !open && setMessagePendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("messages.deleteMessage")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("messages.thisWillPermanentlyDeleteYourMessageThisActionCannotBeUndone")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
                onClick={async () => {
                  if (!messagePendingDelete) return;
                  setDeleting(true);
                  try {
                    await onDeleteMessage(messagePendingDelete.id);
                  } finally {
                    setDeleting(false);
                    setMessagePendingDelete(null);
                  }
                }}
              >
                {t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}
