import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeEventConfig {
  event: PostgresEvent;
  schema?: string;
  table?: string;
  filter?: string;
}

export interface UseRealtimeOptions<T = Record<string, unknown>> {
  channel: string;
  events: RealtimeEventConfig[];
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

    const realtimeChannel: RealtimeChannel = supabase.channel(channel);

    try {
      events.forEach((eventConfig) => {
        realtimeChannel.on(
          'postgres_changes',
          {
            event: eventConfig.event,
            schema: eventConfig.schema ?? 'public',
            table: eventConfig.table,
            filter: eventConfig.filter,
          },
          (payload) => {
            handlerRef.current?.(payload as RealtimePostgresChangesPayload<T>);
          },
        );
      });
    } catch (error) {
      console.error('[useRealtime] Failed to register event handlers', error);
    }

    realtimeChannel.subscribe((status) => {
      setSubscribed(status === 'SUBSCRIBED');
    });

    return () => {
      supabase.removeChannel(realtimeChannel);
      setSubscribed(false);
    };
  }, [channel, enabled, eventsKey]);

  return { subscribed };
}
