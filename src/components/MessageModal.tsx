import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/components/MessageCard";

interface MessageModalProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  message: Message | null;
  onUpdateStatus?: (id: string, status: Message["status"]) => void;
  onAddReply?: (id: string, content: string) => void;
}

export function MessageModal({
  open,
  onOpenChange,
  message,
  onUpdateStatus,
  onAddReply,
}: MessageModalProps) {
  const [reply, setReply] = useState("");

  useEffect(() => {
    setReply("");
  }, [message?.id]);

  const handleStatusToggle = () => {
    if (!message || !onUpdateStatus) return;
    const nextStatus = message.status === "open" ? "closed" : "open";
    onUpdateStatus(message.id, nextStatus);
  };

  const handleReply = () => {
    if (!message || !onAddReply) return;
    const trimmed = reply.trim();
    if (!trimmed) return;
    onAddReply(message.id, trimmed);
    setReply("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{message?.subject || "Message"}</span>
            {message && (
              <div className="flex items-center gap-2">
                <Badge
                  variant={message.status === "open" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {message.status}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {message.category}
                </Badge>
              </div>
            )}
          </DialogTitle>
          <DialogDescription>
            View message details and respond if needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">From: {message?.sender}</div>
          <div>{message?.content}</div>
        </div>

        {message?.replies && message.replies.length > 0 && (
          <div className="mt-6 space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Conversation</h4>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {message.replies.map((reply) => (
                <div
                  key={reply.id}
                  className="bg-muted/60 rounded-md p-3 text-sm"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{reply.author}</span>
                    <span>{new Date(reply.timestamp).toLocaleString()}</span>
                  </div>
                  <div>{reply.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(onUpdateStatus || onAddReply) && (
          <div className="mt-6 space-y-3 border-t pt-4">
            {onAddReply && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Write a reply"
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                  </Button>
                  <Button onClick={handleReply} disabled={!reply.trim()}>
                    Send Reply
                  </Button>
                </div>
              </div>
            )}

            {onUpdateStatus && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleStatusToggle}
              >
                Mark as {message?.status === "open" ? "resolved" : "open"}
              </Button>
            )}

            {!onAddReply && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
