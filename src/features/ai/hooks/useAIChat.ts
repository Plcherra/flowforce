import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseAIChatOptions {
  context?: string;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { context = "general" } = options;

  const sendChatMessage = useCallback(
    async (query: string) => {
      const { data, error } = await supabase.functions.invoke<{
        insights: string;
      }>("ai-insights", {
        body: {
          type: "chat",
          context,
          query,
        },
      });

      if (error) {
        throw error;
      }

      return data?.insights ?? "";
    },
    [context],
  );

  return {
    sendChatMessage,
  };
}

export type UseAIChatReturn = ReturnType<typeof useAIChat>;
