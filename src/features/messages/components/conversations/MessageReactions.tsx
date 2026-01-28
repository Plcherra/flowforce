import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  created_at: string;
}

interface MessageReactionsProps {
  messageId: string;
  className?: string;
}

const COMMON_EMOJIS = [
  "👍",
  "👎",
  "❤️",
  "😊",
  "😂",
  "😮",
  "😢",
  "😡",
  "🎉",
  "👏",
];

export function MessageReactions({
  messageId,
  className = "",
}: MessageReactionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fetchReactions = useCallback(async (targetMessageId: string) => {
    try {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .eq("message_id", targetMessageId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReactions(data || []);
    } catch (error) {
      logger.error("Error fetching reactions", { error, tags: ["error"] });
    }
  }, []);

  const subscribeToReactions = useCallback(
    (targetMessageId: string) => {
      const channel = supabase
        .channel(`reactions:${targetMessageId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "message_reactions",
            filter: `message_id=eq.${targetMessageId}`,
          },
          () => {
            fetchReactions(targetMessageId);
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [fetchReactions],
  );

  useEffect(() => {
    fetchReactions(messageId);
    const unsubscribe = subscribeToReactions(messageId);

    return () => {
      unsubscribe();
    };
  }, [fetchReactions, messageId, subscribeToReactions]);

  const addReaction = async (emoji: string) => {
    if (!user) return;

    // Check if user already reacted with this emoji
    const existingReaction = reactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji,
    );

    if (existingReaction) {
      // Remove reaction if it exists
      await removeReaction(existingReaction.id);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

      if (error) throw error;
      setShowEmojiPicker(false);
    } catch (error) {
      logger.error("Error adding reaction", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to add reaction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeReaction = async (reactionId: string) => {
    try {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", reactionId);

      if (error) throw error;
    } catch (error) {
      logger.error("Error removing reaction", { error, tags: ["error"] });
      toast({
        title: "Error",
        description: "Failed to remove reaction",
        variant: "destructive",
      });
    }
  };

  // Group reactions by emoji and count
  const groupedReactions = reactions.reduce(
    (acc, reaction) => {
      const key = reaction.emoji;
      if (!acc[key]) {
        acc[key] = {
          emoji: reaction.emoji,
          count: 0,
          userIds: [],
          hasUserReacted: false,
        };
      }
      acc[key].count++;
      acc[key].userIds.push(reaction.user_id);
      if (reaction.user_id === user?.id) {
        acc[key].hasUserReacted = true;
      }
      return acc;
    },
    {} as Record<
      string,
      {
        emoji: string;
        count: number;
        userIds: string[];
        hasUserReacted: boolean;
      }
    >,
  );

  const reactionEntries = Object.values(groupedReactions);

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`}>
      {/* Existing reactions */}
      {reactionEntries.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant={reaction.hasUserReacted ? "secondary" : "outline"}
          size="sm"
          className={`h-6 px-2 text-xs rounded-full ${
            reaction.hasUserReacted
              ? "bg-primary/20 text-primary border-primary/30"
              : "hover:bg-primary/10"
          }`}
          onClick={() => addReaction(reaction.emoji)}
          disabled={loading}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 rounded-full hover:bg-primary/10"
            disabled={loading}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10"
                onClick={() => addReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
