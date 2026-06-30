import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface PostgresChangeEventConfig {
  event: PostgresEvent;
  schema?: string;
  table?: string;
  filter?: string;
}

type PostgresListener = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) => void;

interface ManagedPostgresChannel {
  channel: RealtimeChannel;
  listeners: Set<PostgresListener>;
  eventsKey: string;
}

const managedChannels = new Map<string, ManagedPostgresChannel>();

function createChannel(
  channelName: string,
  events: PostgresChangeEventConfig[],
  eventsKey: string,
): ManagedPostgresChannel {
  const listeners = new Set<PostgresListener>();

  const broadcast = (
    payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  ) => {
    listeners.forEach((listener) => listener(payload));
  };

  let channel = supabase.channel(channelName);

  for (const eventConfig of events) {
    channel = channel.on(
      "postgres_changes",
      {
        event: eventConfig.event,
        schema: eventConfig.schema ?? "public",
        table: eventConfig.table,
        filter: eventConfig.filter,
      },
      broadcast,
    );
  }

  channel.subscribe();

  return {
    channel,
    listeners,
    eventsKey,
  };
}

export function subscribeSharedPostgresChannel(
  channelName: string,
  events: PostgresChangeEventConfig[],
  eventsKey: string,
  listener: PostgresListener,
): () => void {
  if (!channelName || events.length === 0) {
    return () => undefined;
  }

  let managed = managedChannels.get(channelName);

  if (!managed || managed.eventsKey !== eventsKey) {
    if (managed) {
      void supabase.removeChannel(managed.channel);
    }
    managed = createChannel(channelName, events, eventsKey);
    managedChannels.set(channelName, managed);
  }

  managed.listeners.add(listener);

  return () => {
    const current = managedChannels.get(channelName);
    if (!current) {
      return;
    }

    current.listeners.delete(listener);

    if (current.listeners.size === 0) {
      void supabase.removeChannel(current.channel);
      managedChannels.delete(channelName);
    }
  };
}
