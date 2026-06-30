import { useEffect, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";
import {
  subscribeSharedPostgresChannel,
  type PostgresChangeEventConfig,
  type PostgresEvent,
} from "@/lib/realtime/sharedPostgresChannel";

export type { PostgresEvent, PostgresChangeEventConfig as RealtimeEventConfig };

export interface UseRealtimeOptions<T = Record<string, unknown>> {
  channel: string;
  events: PostgresChangeEventConfig[];
  enabled?: boolean;
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export interface UseRealtimeResult {
  subscribed: boolean;
}

export function useRealtime<T = Record<string, unknown>>({
  channel,
  events,
  enabled = true,
  onPayload,
}: UseRealtimeOptions<T>): UseRealtimeResult {
  const [subscribed, setSubscribed] = useState(false);
  const handlerRef = useRef(onPayload);
  handlerRef.current = onPayload;
  const eventsKey = JSON.stringify(events);

  useEffect(() => {
    if (!enabled || !channel || !events.length) {
      setSubscribed(false);
      return;
    }

    setSubscribed(true);

    return subscribeSharedPostgresChannel(
      channel,
      events,
      eventsKey,
      (payload) => {
        try {
          handlerRef.current?.(payload as RealtimePostgresChangesPayload<T>);
        } catch (error) {
          logger.error("[useRealtime] Error processing payload", {
            error,
            channel,
            tags: ["error", "realtime"],
          });
        }
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [channel, enabled, eventsKey]);

  return { subscribed };
}
