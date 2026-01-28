import React, { useRef, useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Trash2, Edit2, Check, X } from "lucide-react";
import { MessageReactions } from "./MessageReactions";
import { format } from "date-fns";
import type { Message, ThreadMessage } from "@/types/messages";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/utils/logger";
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
  onThreadMessage,
  currentUserId,
  onDeleteMessage,
  onUpdateMessage,
  channelMembers = [],
}: MessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messagePendingDelete, setMessagePendingDelete] =
    useState<Message | null>(null);
  const safeMessages = asArray(messages);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (safeArrayLength(safeMessages) > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [safeMessages]);

  const handleSaveEdit = async (messageId: string) => {
    if (!onUpdateMessage || !editContent.trim()) return;
    setUpdating(true);
    try {
      await onUpdateMessage(messageId, editContent.trim());
      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      logger.error("Failed to update message", { error, tags: ["error"] });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <ScrollArea
        className="flex-1 p-4"
        aria-label="Loading conversation messages"
      >
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`messages-skeleton-${index}`} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4" role="log" aria-live="polite">
        {safeArrayLength(safeMessages) === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No messages yet. Be the first to send one!
            </p>
          </div>
        ) : (
          safeArrayMap(safeMessages, (message) => {
            const senderProfile = message.sender_profile ?? {
              first_name: "",
              last_name: "",
              avatar_url: null,
            };
            const firstName = senderProfile.first_name ?? "";
            const lastName = senderProfile.last_name ?? "";
            const displayName =
              `${firstName} ${lastName}`.trim() || "Team member";
            const initials =
              `${firstName.charAt(0) ?? ""}${lastName.charAt(0) ?? ""}`.trim() ||
              displayName.charAt(0).toUpperCase() ||
              "U";
            const createdAt = message.created_at
              ? new Date(message.created_at)
              : null;
            const formattedTimestamp =
              createdAt && !Number.isNaN(createdAt.getTime())
                ? format(createdAt, "MMM dd, yyyy at h:mm a")
                : "";

            const replyProfile = message.reply_to_message?.sender_profile;
            const replyName = replyProfile
              ? [replyProfile.first_name, replyProfile.last_name]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "a teammate"
              : "a teammate";

            // Calculate read receipts
            const messageTime = createdAt ? createdAt.getTime() : 0;
            const readBy = channelMembers
              .filter((member) => {
                if (member.user_id === message.sender_id) return false; // Don't show sender as read
                if (!member.last_read_at) return false;
                const readTime = new Date(member.last_read_at).getTime();
                return readTime >= messageTime;
              })
              .map((m) => m.user_id);
            const unreadCount = channelMembers.length - readBy.length - 1; // -1 for sender

            return (
              <div
                key={message.id}
                className="group flex gap-3 rounded-lg p-2 transition hover:bg-muted/60 focus-within:bg-muted/60 dark:hover:bg-muted/40"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderProfile.avatar_url || undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-foreground">
                      {displayName}
                    </p>
                    {formattedTimestamp && (
                      <p className="text-xs text-muted-foreground">
                        {formattedTimestamp}
                      </p>
                    )}
                  </div>
                  {message.reply_to_message && (
                    <div className="mt-1 rounded border-l-2 border-border bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">
                        Replying to {replyName}
                      </p>
                      <p className="truncate text-sm text-foreground/80">
                        {message.reply_to_message.content || "Shared a message"}
                      </p>
                    </div>
                  )}

                  {/* Message Content - Edit or Display */}
                  {editingMessageId === message.id ? (
                    <div className="mt-2 space-y-2">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(message.id);
                          }
                          if (e.key === "Escape") {
                            setEditingMessageId(null);
                            setEditContent("");
                          }
                        }}
                        autoFocus
                        className="text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSaveEdit(message.id)}
                          disabled={updating || !editContent.trim()}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditContent("");
                          }}
                          disabled={updating}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm text-foreground">
                        {message.content}
                        {message.edited_at && (
                          <span className="ml-2 text-xs text-muted-foreground italic">
                            (edited)
                          </span>
                        )}
                      </p>

                      {/* Message Actions */}
                      <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Open thread for message from ${displayName}`}
                          onClick={() => {
                            onThreadMessage({
                              id: message.id,
                              content: message.content,
                              sender: {
                                id: message.sender_id,
                                name: displayName,
                                avatar: senderProfile.avatar_url ?? undefined,
                              },
                              createdAt: createdAt ?? new Date(),
                              replyCount: 0,
                            });
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        {message.sender_id === currentUserId &&
                          onUpdateMessage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Edit message"
                              onClick={() => {
                                setEditingMessageId(message.id);
                                setEditContent(message.content);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        {message.sender_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Delete message"
                            onClick={() => setMessagePendingDelete(message)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}

                  {/* Message Reactions */}
                  <MessageReactions messageId={message.id} className="mt-2" />

                  {/* Read Receipts */}
                  {readBy.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <span>Read by {readBy.length}</span>
                      {unreadCount > 0 && <span>• {unreadCount} unread</span>}
                    </div>
                  )}
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
              <AlertDialogTitle>Delete message</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your message. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
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
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}
